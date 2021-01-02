class Today {
	constructor() {
		this.date = new Date();
	}
	someYear() {
		const month = this.month().toString().padStart(2, '0');
		const day = this.date.getDate().toString().padStart(2, '0');
		return `${month}-${day}`;
	}
	day() {
		return this.date.getDate();
	}
	month() {
		return this.date.getMonth() + 1;
	}
}
module.exports = { Today };
