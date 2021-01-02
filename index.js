/*
 * Database stuff
 */

async function openDatabase() {
	const sqlite3 = require('sqlite3').verbose();
	const open = require('sqlite').open;
	return await open({
		filename: './2.imdb.with_types.db',
		driver: sqlite3.Database,
		mode: sqlite3.OPEN_READONLY,
	});
}

async function top(year) {
	const topCount = process.env.topCount ?? 20;
	const db = await openDatabase();
	const movies = await db.all(
		` SELECT original_title, (total_votes * mean_vote + 25000 * (SELECT AVG(mean_vote) FROM ratings)) / (total_votes + 25000) AS wr FROM movies JOIN ratings ON movies.imdb_title_id=ratings.imdb_title_id WHERE YEAR ='${year}' ORDER BY wr DESC LIMIT ${topCount};`,
	);

	let text = '';
	if (movies.length) {
		text = `These are the top ${topCount} movies from ${year}:\n`;
		movies.forEach((movie) => {
			text = top.concat(movie.original_title + '\t' + movie.wr + '\n');
		});
	}
	else {
		text = `There are no movies in year ${year} \u{1F624}\n`;
	}
	await db.close();
	return text;
}

async function anniversary(date) {
	const db = await openDatabase();
	// First get a principal with an anniversary on a day like this. It could either be the birth date or the passing date

	// Warning: this query is SLOW because it has to go over the whole principals table and do a text comparison on the dates. This could be improved by using an Index

	// Also note that we're getting the COUNT of roles the principal had. In order to get only one row with the count we're using GROUP BY.

	const principal = await db.get(
		`SELECT names.name, names.imdb_name_id, names.date_of_birth, names.date_of_death, COUNT(title_principals.imdb_name_id) roles FROM names LEFT JOIN title_principals on names.imdb_name_id == title_principals.imdb_name_id WHERE date_of_birth LIKE '%-${date.someYear()}' OR date_of_death LIKE '%-${date.someYear()}' GROUP BY name ORDER BY RANDOM() LIMIT 1;`,
	);
	if (!principal) return;
	let text = `Welcome back!\nDid you know that ${principal.name} ${
		principal.date_of_birth ? 'was born' : 'died'
	} on a day like this, ${date.day} of ${date.month} and features in ${
		principal.roles
	} films, like:\n`;

	const movies = await db.all(
		`SELECT * FROM movies JOIN title_principals ON movies.imdb_title_id = title_principals.imdb_title_id AND title_principals.imdb_name_id =  '${principal.imdb_name_id}'`,
	);
	movies.forEach((row) => {
		text += `${row.title}\n`;
	});

	await db.close();

	return text;
}

/*
 * Discord client stuff
 */

// Reads config from env file.
// *NEVER* store the bot token in source control
const dotenv = require('dotenv');
dotenv.config();
const prefix = process.env.prefix ?? '!';
const token = process.env.token;

// Create a Discord.js client.
// It extends EventEmitter, hence we can use the on() and once() events
const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('message', async (message) => {
	// ignores all messages not starting with the prefix or sent by a bot
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	// extracts the command
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();

	switch (command) {
	case 'top': {
		if (!args.length) {
			return message.channel.send(
				`Please tell me which year: !top year, ${message.author}!`,
			);
		}
		const maybeYear = args.shift();
		const year = parseInt(maybeYear);
		if (isNaN(year)) {
			return message.channel.send(
				`${maybeYear} is not a valid year, ${message.author}!`,
			);
		}
		message.channel.send(await top(year));
		break;
	}
	case 'anniversary': {
		const today = new (require('./dates.js').Today)();
		message.channel.send(await anniversary(today));
		break;
	}
	default:
		return;
	}
});

// Requires activating the Presence Intent in the bot configuration page
client.on('presenceUpdate', async (oldPresence, newPresence) => {
	if (
		!oldPresence ||
		(oldPresence.status !== 'online' && newPresence.status === 'online')
	) {
		const today = new (require('./dates.js').Today)();
		newPresence.user.send(await anniversary(today));
	}
});

client.login(token);
