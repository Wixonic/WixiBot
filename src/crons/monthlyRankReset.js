const Rank = require("../lib/rank.js");

/**
 * @type {import("../types").CronInfo}
 */
const cron = {
	name: "Monthly Rank Reset",
	priority: 2,
	condition: (minutes, now) => false, // minutes % (60 * 24) == 0 && now.getDate() == 1, // 1st of the month, at 00:00 UTC
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const previousLeaderboard = Rank.getLeaderboard(logger, bot.settings);
		const role = await guild.roles.fetch(bot.settings.application.commands.rank.bestRole[guild.id]);

		if (role) {
			role.members.forEach((member) => member.roles.remove(role.id));

			if (previousLeaderboard.firstOfTheMonth) {
				try {
					const previousMember = await guild.members.fetch(previousLeaderboard.firstOfTheMonth.id);
					await previousMember.roles.add(role.id);

					// TODO: send announcement for first of the month
				} catch (e) {
					logger.error(`Failed to remove ${role.name} (${role.id})`);
				}
			}
		}

		await Rank.resetLeaderboard(logger, bot.settings);
	}
};

module.exports = cron;