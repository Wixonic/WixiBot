const fs = require("fs");
const path = require("path");

const log = require("../log.js");

class Giveaway {
	static status = {
		planned: 0,
		active: 1,
		done: 2
	};

	static get(guildId, memberId) {
		const guildPath = path.join(config.cache.ranks, guildId);
		const memberPath = path.join(guildPath, memberId + ".json");

		if (!fs.existsSync(memberPath)) return new Rank(guildId, memberId);
		else {
			try {
				return new Rank(guildId, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				log.error(`[Rank] Failed to read rank data: ${e}`);
				return new Rank(guildId, memberId);
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
						id: giveaway.id,
						startDate: giveaway.startDate,
						endDate: giveaway.endDate
					});
				} catch (e) {
					log.error(`[Giveaway] Failed to read rank data for file ${file}: ${e}`);
				}
			}
		}

		giveaways.filter((giveaway) => giveaway.status != Giveaway.status.done)
	};
};