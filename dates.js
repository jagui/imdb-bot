class Today {
	constructor() {
		const date = new Date();
		this.month = (date.getMonth() + 1).toString().padStart(2, '0');
		this.day = date.getDate().toString().padStart(2, '0');
	}
	someYear() {
		return `${this.month}-${this.day}`;
	}
}
module.exports = { Today };
