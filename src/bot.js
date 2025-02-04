const { Client } = require("discord.js");

class Bot extends Client {

	/**
	 * @param {{intents: import("discord.js").GatewayIntentBits[]}} options
	 */
	constructor(options) {
		super({
			intents: options.intents
		});
	};
};

module.exports = {
	Bot
};