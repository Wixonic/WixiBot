const { Client } = require("discord.js");

class Bot extends Client {
	/**
	 * @param {Logger} logger
	 * @param {{intents: import("discord.js").GatewayIntentBits[], webhook: URL | string}} options
	 */
	constructor(logger, options) {
		super({
			intents: options.intents
		});

		if (URL.canParse(options.webhook)) this.webhook = new URL(options.webhook);
		else logger.error("[Client]", "Failed to parse Webhook");

		this.logger = {
			debug: (...any) => logger.debug("[Client]", ...any),
			info: (...any) => logger.info("[Client]", ...any),
			error: (...any) => logger.error("[Client]", ...any),
			warn: (...any) => logger.warn("[Client]", ...any)
		};
	};

	/**
	 * @param {string} token
	 */
	async login(token) {
		try {
			const result = await super.login(token);
			this.logger.info("Successfully logged in");
			return result;
		} catch (e) {
			this.logger.error("Failed to login:", e);
			return null;
		}
	};
};

module.exports = {
	Bot
};