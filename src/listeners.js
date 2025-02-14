const fs = require("fs");
const path = require("path");

class ListenerHandler {
	/**
	 * @param {Logger} logger
	 */
	constructor(logger) {
		this.logger = logger;
		this.listeners = [];
	};

	/**
	 * @param {import("./bot.js").Bot} bot
	 */
	loadListeners(bot) {
		const listenersPath = path.join(__dirname, "listeners");
		const files = fs.readdirSync(listenersPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const listener = require(path.join(listenersPath, file));
			if (typeof listener.event !== "string" || typeof listener.run !== "function") this.logger.warn("Invalid listener:", file);
			else {
				bot.on(listener.event, (...args) => listener.run(this.logger.basicIndent(`[${listener.name}]`), ...args));
				this.listeners.push(listener.event);

				this.logger.debug("Loaded listener:", listener.name);
			}
		};
	};

	/**
	 * @param {import("./bot.js").Bot} bot
	 */
	destroy(bot) {
		for (const listener of this.listeners) {
			bot.removeAllListeners(listener);
			this.logger.debug(`Removed listener: ${listener}`);
		}

		this.listeners = [];
	};
};

module.exports = ListenerHandler;