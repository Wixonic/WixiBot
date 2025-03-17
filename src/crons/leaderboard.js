const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Leaderboard Update",
	priority: 1,
	condition: (minutes, now) => true, // minutes % 30 == 0, // Every half hour
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const previousLeaderboard = Rank.getLeaderboard(logger, bot.settings);
		const leaderboard = Rank.updateLeaderboard(logger, bot.settings);

		if (previousLeaderboard.firstOfTheMonth?.id != leaderboard.firstOfTheMonth?.id) {
			const role = await guild.roles.fetch(bot.settings.application.commands.rank.bestRole);

			// TODO: send announcement when changed
		}
	}
};

module.exports = cron;