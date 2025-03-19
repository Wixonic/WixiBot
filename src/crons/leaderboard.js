const monthlyRankResetCron = require("./monthlyRankReset.js");
const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Leaderboard Update",
	priority: 2,
	condition: (minutes, now) => minutes % 30 == 0, // Every half hour
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const previousLeaderboard = Rank.getLeaderboard(logger, bot.settings);
		const leaderboard = Rank.updateLeaderboard(logger, bot.settings);

		if (previousLeaderboard.firstOfTheMonth?.id != leaderboard.firstOfTheMonth?.id && leaderboard.firstOfTheMonth?.id) {
			const channel = await guild.channels.fetch(bot.settings.application.commands.rank.channel);

			if (!monthlyRankResetCron.condition(minutes, now)) {
				if (channel && channel.isSendable()) {
					try {
						await channel.send({
							content: `<@${leaderboard.firstOfTheMonth.id}> is now first on the monthly leaderboard and the next candidate for the <@&${bot.settings.application.commands.rank.firstOfTheMonthRole}> role!`,
							allowedMentions: {
								users: [leaderboard.firstOfTheMonth.id]
							}
						});
					} catch (e) {
						logger.warn("Failed to ping new Elite of the Month:", e);
					}
				} else logger.error("Failed to ping new Elite of the Month: invalid channel");
			}
		}
	}
};

module.exports = cron;