const { EventEmitter } = require("stream");

class BaseObject extends EventEmitter {
	constructor() {
		super();

		this.destroyed = false;
	};

	destroy(reason = "Unknown reason") {
		if (this.destroyed == false) {
			this.destroyed = reason;
			this.log(`Destroyed: ${this.destroyed}`);
		}
	};

	log = (content) => console.log(`[${this.constructor.name}] ${typeof content == "string" ? content : JSON.stringify(content, null, 2)}`);
};

module.exports = {
	BaseObject
};