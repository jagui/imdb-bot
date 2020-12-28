const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const client = new Discord.Client();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./2.imdb.with_types.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the imdb database.');
});

client.once('ready', () => {
  console.log('Ready!');
});

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'top': {
      if (!args.length) {
        return message.channel.send(`Necesito que me digas el año: !top año, ${message.author}!`);
      }
      const maybeYear = args.shift();
      const year = parseInt(maybeYear);
      if (isNaN(year)) {
        return message.channel.send(`${maybeYear} no es un año válido, ${message.author}!`);
      }
      db.serialize(() => {
        db.all(` SELECT original_title, (total_votes * mean_vote + 25000 * (SELECT AVG(mean_vote) FROM ratings)) / (total_votes + 25000) AS wr FROM movies JOIN ratings ON movies.imdb_title_id=ratings.imdb_title_id WHERE YEAR ='${year}' ORDER BY wr DESC LIMIT 10;
        `, (err, rows) => {
          if (err) {
            return console.error(err.message);
          }
          let top = '';
          rows.forEach(row => {
            top = top.concat(row.original_title + '\t' + row.wr + '\n');
          });
          message.channel.send(top);
        });
      });
      break;
    }
    case 'efemerides': {
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = (date.getDate()).toString().padStart(2, '0');
      const todaySomeYear = `${month}-${day}`;

      db.serialize(() => {
        db.all(`SELECT name, COUNT(title_principals.imdb_name_id) roles FROM names LEFT JOIN title_principals on names.imdb_name_id == title_principals.imdb_name_id WHERE date_of_birth LIKE '%-${todaySomeYear}' GROUP BY name ORDER BY roles DESC LIMIT 10;
          `, (err, rows) => {
          if (err) {
            return console.error(err.message);
          }
          let efemerides = `Estas personas nacieron en un día como hoy, ${day} del ${month}\n`;
          rows.forEach(row => {
            efemerides = efemerides.concat(row.name + '\t' + row.roles + '\n');
          });
          message.channel.send(efemerides);
        });
      });
      break;
    }
    default:
      return;
  }
});

client.login(token);
