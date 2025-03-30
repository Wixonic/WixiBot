const monthlyRankResetCron = require("./monthlyRankReset.js");
const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Leaderboard Update",
	priority: 2,
	condition: (minutes, now) => minutes % 30 == 0, // Every 30 minutes
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const previousLeaderboard = Rank.getLeaderboard(logger, bot);
		const leaderboard = Rank.updateLeaderboard(logger, bot);

		if (leaderboard.eliteOfTheMonth && previousLeaderboard.eliteOfTheMonth?.id != leaderboard.eliteOfTheMonth.id) {
			const channel = await guild.channels.fetch(bot.settings.application.commands.ranks.channel);

			if (!monthlyRankResetCron.condition(minutes, now)) {
				if (channel && channel.isSendable()) {
					try {
						await channel.send({
							content: `<@${leaderboard.eliteOfTheMonth.id}> is now first on the monthly leaderboard and the next candidate for the <@&${bot.settings.application.commands.ranks.eliteOfTheMonthRole}> role!`,
							allowedMentions: {
								users: [leaderboard.eliteOfTheMonth.id]
							}
						});
					} catch (e) {
						logger.warn(e);
					}
				} else logger.error("Invalid channel");
			}
		}
	}
};

module.exports = cron;