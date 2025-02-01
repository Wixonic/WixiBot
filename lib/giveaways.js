const fs = require("fs");
const path = require("path");

const log = require("../log.js");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @typedef {object} Gift
 * @property {string} name
 * @property {string} secret
 */

/**
 * @typedef {object} GiveawayData
 * @property {Gift[]} gifts
 * @property {string[]} participants
 * @property {number?} startsAt
 * @property {number?} endsAt
 * @property {number} status
 * @property {string?} message
 */

class Giveaway {
	static status = {
		planned: 0,
		active: 1,
		done: 2
	};

	static generateId = (timestamp, guildId) => {
		let length = 0;
		if (fs.existsSync(path.join(config.cache.giveaways, guildId))) length = fs.readdirSync(path.join(config.cache.giveaways, guildId), { encoding: "utf-8" }).length;
		return `g${timestamp.toString(36)}T${length.toString(36)}`;
	};

	static get(guildId, giveawayId) {
		const guildPath = path.join(config.cache.giveaways, guildId);
		const giveawayPath = path.join(guildPath, giveawayId + ".json");

		if (!fs.existsSync(giveawayPath)) return new Giveaway(guildId, this.generateId(Date.now(), guildId));
		else {
			try {
				return new Giveaway(guildId, giveawayId, JSON.parse(fs.readFileSync(giveawayPath, "utf-8")));
			} catch (e) {
				log.error(`[Giveaway] Failed to read giveaway data: ${e}`);
				return new Giveaway(guildId, giveawayId);
			}
		}
	};

	/**
	 * @param {string} guildId 
	 * @returns {Giveaway[]}
	 */
	static list(guildId) {
		const guildPath = path.join(config.cache.giveaways, guildId);

		const giveaways = [];

		if (!fs.existsSync(guildPath)) return giveaways;

		for (const file of fs.readdirSync(guildPath)) {
			if (![".DS_Store"].includes(file)) {
				try {
					const giveaway = Giveaway.get(guildId, file.replace(".json", ""));
					giveaways.push(giveaway);
				} catch (e) {
					log.error(`[Giveaway] Failed to read giveaway data for file ${file}: ${e}`);
				}
			}
		}

		return giveaways;
	};

	/**
	 * @param {number} guildId
	 * @param {number} giveawayId
	 * @param {GiveawayData?} data
	 */
	constructor(guildId, giveawayId, data) {
		this.guildId = guildId;
		this.giveawayId = giveawayId;

		this.gifts = data?.gifts ?? [];
		this.participants = data?.participants ?? [];
		this.startsAt = data?.startsAt;
		this.endsAt = data?.endsAt;
		this.previousStatus = data?.status;
		this.message = data?.message;
		this.winners = data?.winners;

		if (!data) this.save();
	};

	get status() {
		if (typeof this.startsAt == "number" && typeof this.endsAt == "number") {
			if (this.endsAt <= Date.now()) return Giveaway.status.done;
			else if (this.startsAt <= Date.now()) return Giveaway.status.active;
		}

		return Giveaway.status.planned;
	};

	async save() {
		const giveawaysSettings = settings.guilds[this.guildId]?.giveaways;

		if (giveawaysSettings?.active) {
			const guildPath = path.join(config.cache.giveaways, this.guildId);
			const giveawayPath = path.join(guildPath, this.giveawayId + ".json");

			if (!fs.existsSync(guildPath)) fs.mkdirSync(guildPath, { recursive: true });
			fs.writeFileSync(giveawayPath, JSON.stringify({
				gifts: this.gifts,
				participants: this.participants,
				startsAt: this.startsAt,
				endsAt: this.endsAt,
				status: this.status,
				message: this.message,
				winners: this.winners
			}), "utf-8");
		}
	};
};

module.exports = {
	Giveaway
};