const fs = require("fs");

const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Voice Check",
	priority: 0,
	condition: (minutes, now) => minutes % 5 === 0, // Every 5 minutes
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const guildPath = bot.settings.paths.ranks(bot.settings.application.guildId);

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (file.endsWith(".json")) {
					try {
						const rank = Rank.get(logger, bot, file.replace(".json", ""));

						if (rank) {
							try {
								const member = await guild.members.fetch(rank.memberId);

								if (rank.voice.startedAt !== null && (!member.voice.channel || !Rank.canGetPoint(member, member.voice.channel))) {
									logger.debug(`Voice force-stopped for "${member.displayName}" (${member.id})`);
									await rank.voiceStop();
								}
							} catch (e) {
								logger.debug(`[Rank] Error fetching member "${rank.memberId}":`, e);
							}
						} else logger.warn(`[Rank] Error reading rank data for file ${file}`);
					} catch (e) {
						logger.error(`[Rank] Error reading rank data for file ${file}:`, e);
					}
				}
			}
		}
	}
};

module.exports = cron;