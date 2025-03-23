const fs = require("fs");

const { randomInt } = require("../lib/utils.js");

class Giveaway {
	static status = {
		planned: 0,
		active: 1,
		done: 2,
		cancelled: 3
	};

	/**
	 * @param {number?} timestamp
	 */
	static generateId = (timestamp) => `g${(timestamp ?? Date.now()).toString(36)}`;

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @param {string?} giveawayId
	 */
	static get(logger, bot, giveawayId) {
		const giveawayPath = bot.settings.paths.giveaway(bot.settings.application.guildId, giveawayId);

		if (!fs.existsSync(giveawayPath)) return new this(logger, bot, this.generateId());
		else {
			try {
				return new this(logger, bot, giveawayId, JSON.parse(fs.readFileSync(giveawayPath, "utf-8")));
			} catch (e) {
				logger.error("[Giveaway] Error reading data:", e);
				return new this(logger, bot, giveawayId);
			}
		}
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @returns {Giveaway[]}
	 */
	static list(logger, bot) {
		const guildPath = bot.settings.paths.giveaways(bot.settings.application.guildId);

		const giveaways = [];

		if (!fs.existsSync(guildPath)) return giveaways;

		for (const file of fs.readdirSync(guildPath)) {
			if (file.endsWith(".json")) {
				try {
					const giveaway = this.get(logger, bot, file.replace(".json", ""));
					giveaways.push(giveaway);
				} catch (e) {
					logger.error(`[Giveaway] Error reading data from file "${file}":`, e);
				}
			}
		}

		return giveaways;
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @param {number} giveawayId
	 * @param {import("../types.d.ts").GiveawayData?} data
	 */
	constructor(logger, bot, giveawayId, data) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug(`[Giveaway ${giveawayId}]`, ...any),
			error: (...any) => logger.error(`[Giveaway ${giveawayId}]`, ...any),
			info: (...any) => logger.info(`[Giveaway ${giveawayId}]`, ...any),
			warn: (...any) => logger.warn(`[Giveaway ${giveawayId}]`, ...any)
		};

		this.bot = bot;

		this.id = giveawayId;

		this.gifts = data?.gifts ?? [];
		this.participants = data?.participants ?? [];
		this.startsAt = data?.startsAt;
		this.endsAt = data?.endsAt;
		this.previousStatus = data?.status;
		this.cancelled = data?.cancelled ?? false;
		this.message = data?.message;
		this.winners = data?.winners;

		if (!data) this.save();
	};

	get status() {
		if (this.cancelled) return Giveaway.status.cancelled;

		if (typeof this.startsAt == "number" && typeof this.endsAt == "number") {
			if (this.endsAt <= Date.now()) return Giveaway.status.done;
			else if (this.startsAt <= Date.now()) return Giveaway.status.active;
		}

		return Giveaway.status.planned;
	};

	async save() {
		const guildPath = this.bot.settings.paths.giveaways(this.bot.settings.application.guildId);
		const giveawayPath = this.bot.settings.paths.giveaway(this.bot.settings.application.guildId, this.id);

		if (!fs.existsSync(guildPath)) fs.mkdirSync(guildPath, { recursive: true });
		fs.writeFileSync(giveawayPath, JSON.stringify({
			gifts: this.gifts,
			participants: this.participants,
			startsAt: this.startsAt,
			endsAt: this.endsAt,
			status: this.status,
			cancelled: this.cancelled,
			message: this.message,
			winners: this.winners
		}), "utf-8");
	};
};

module.exports = Giveaway;