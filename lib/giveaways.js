const fs = require("fs");
const path = require("path");

const log = require("../log.js");

const config = require("../config.js");
const settings = require("../settings.js");

class Giveaway {
	static status = {
		planned: 0,
		active: 1,
		done: 2
	};

	static generateId = (timestamp) => {
		let length = 0;
		if (fs.existsSync(config.cache.giveaways)) length = fs.readdirSync(config.cache.giveaways, { encoding: "utf-8" }).length;
		return `${timestamp.toString(36)}T${length.toString(36)}`;
	};

	static get(guildId, giveawayId) {
		const guildPath = path.join(config.cache.giveaways, guildId);
		const giveawayPath = path.join(guildPath, giveawayId + ".json");

		if (!fs.existsSync(giveawayPath)) return new Giveaway(guildId, this.generateId());
		else {
			try {
				return new Rank(guildId, giveawayId, JSON.parse(fs.readFileSync(giveawayPath, "utf-8")));
			} catch (e) {
				log.error(`[Giveaway] Failed to read giveaway data: ${e}`);
				return new Rank(guildId, giveawayId);
			}
		}
	};

	static list(guildId) {
		const guildPath = path.join(config.cache.giveaways, guildId);

		const giveaways = [];

		if (!fs.existsSync(guildPath)) return giveaways;

		for (const file of fs.readdirSync(guildPath)) {
			if (![".DS_Store"].includes(file)) {
				try {
					const giveaway = Giveaway.get(guildId, file.replace(".json", ""));

					giveaways.push({
						id: file,
						startDate: giveaway.startDate,
						endDate: giveaway.endDate
					});
				} catch (e) {
					log.error(`[Giveaway] Failed to read giveaway data for file ${file}: ${e}`);
				}
			}
		}

		return giveaways.filter((giveaway) => giveaway.status != Giveaway.status.done);
	};

	constructor(guildId, giveawayId, data) {
		if (data) {
			this.guildId = guildId;
			this.giveawayId = giveawayId;

			this.gifts = data.gifts ?? {};
			this.participants = data.participants ?? [];
			this.startAt = data.startAt;
			this.endAt = data.endAt;
		} else {
			this.guildId = guildId;
			this.giveawayId = giveawayId;

			this.gifts = {};
			this.participants = [];

			this.save();
		}
	};

	get status() {
		if (typeof this.startAt == "number" && typeof this.endAt == "number") {
			if (this.endAt < Date.now()) return Giveaway.status.done;
			else if (this.startAt < Date.now()) return Giveaway.status.active;
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
				startAt: this.startAt,
				endAt: this.endAt
			}), "utf-8");
		}
	};
};

module.exports = {
	Giveaway
};