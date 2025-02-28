const fs = require("fs");
const path = require("path");

class ListenerHandler {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 */
	constructor(logger) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug("[Listeners]", ...any),
			error: (...any) => logger.error("[Listeners]", ...any),
			info: (...any) => logger.info("[Listeners]", ...any),
			warn: (...any) => logger.warn("[Listeners]", ...any)
		};
		this.listeners = [];
	};

	/**
	 * @param {import("./bot.js")} bot
	 */
	loadListeners(bot) {
		const listenersPath = path.join(__dirname, "..", "listeners");
		const files = fs.readdirSync(listenersPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const listener = require(path.join(listenersPath, file));
			if (typeof listener.event !== "string" || typeof listener.run !== "function") this.logger.warn("Invalid listener:", file);
			else {
				bot.on(listener.event, (...args) => listener.run(bot, {
					debug: (...any) => this.logger.debug(`[${listener.name}]`, ...any),
					error: (...any) => this.logger.error(`[${listener.name}]`, ...any),
					info: (...any) => this.logger.info(`[${listener.name}]`, ...any),
					warn: (...any) => this.logger.warn(`[${listener.name}]`, ...any)
				}, ...args));
				this.listeners.push(listener.event);

				this.logger.debug("Loaded listener:", listener.name);
			}
		};
	};

	/**
	 * @param {import("./bot.js")} bot
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