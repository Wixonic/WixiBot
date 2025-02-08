const path = require("path");

class Command {
	static list = [];
	static folder = path.join(__dirname, "commands");

	static get(name) {
		const commandFolder = path.join(this.folder, name);
	};

	/**
	 * @param {Logger} logger 
	 */
	static async init(logger) {
		logger.debug("Initializing commands.");
	};

	/**
	 * @param {CommandOptions} options 
	 */
	constructor(options) {

	};
};

