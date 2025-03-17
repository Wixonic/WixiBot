const fs = require("fs");
const path = require("path");

class CronHandler {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 */
	constructor(logger) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug("[Crons]", ...any),
			error: (...any) => logger.error("[Crons]", ...any),
			info: (...any) => logger.info("[Crons]", ...any),
			warn: (...any) => logger.warn("[Crons]", ...any)
		};

		this.crons = [];
		this.destroyed = false;
	};

	loadCrons() {
		const cronsPath = path.join(__dirname, "..", "crons");
		const files = fs.readdirSync(cronsPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const modulePath = path.join(cronsPath, file);
			delete require.cache[require.resolve(modulePath)];
			const cron = require(modulePath);

			if (!cron) {
				this.logger.warn("Invalid cron at", file);
				continue;
			} else if (typeof cron.name != "string") cron.name = file.slice(0, -3);

			if (typeof cron.condition != "function" || typeof cron.run != "function") this.logger.warn("Invalid cron:", cron.name);
			else {
				this.crons.push(cron);
				this.logger.debug("Loaded cron:", cron.name);
			}
		};
	};

	/**
	 * @param {import("./bot.js")} bot 
	 */
	async init(bot) {
		await this.execute(bot);
	};

	/**
	 * @param {import("./bot.js")} bot 
	 */
	async execute(bot) {
		if (!this.destroyed) {
			const minutes = Math.floor(Date.now() / 1000 / 60);
			const now = new Date(minutes * 60 * 1000);

			for (const cron of this.crons.sort((cronA, cronB) => (cronB.priority ?? 0) - (cronA.priority ?? 0))) {
				const cronLogger = {
					debug: (...any) => this.logger.debug(`[${cron.name}]`, ...any),
					error: (...any) => this.logger.error(`[${cron.name}]`, ...any),
					info: (...any) => this.logger.info(`[${cron.name}]`, ...any),
					warn: (...any) => this.logger.warn(`[${cron.name}]`, ...any)
				};

				if (cron.condition(minutes, now)) {
					try {
						cronLogger.info(`Launched at ${now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit" })}`);
						await cron.run(cronLogger, bot, minutes, now);
						cronLogger.debug("Finished");
					} catch (e) {
						cronLogger.error(e);
					}
				}
			}

			setTimeout(() => this.execute(bot), (minutes + 1) * 1000 * 60 - Date.now());
		}
	};

	destroy() {
		this.destroyed = true;
		for (const cron of this.crons) this.logger.debug(`Removed cron: ${cron}`);
		this.crons = [];
	};
};

module.exports = CronHandler;