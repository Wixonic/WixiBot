const Rank = require("../lib/rank.js");

/**
 * @type {import("../types").CronInfo}
 */
const cron = {
	name: "Monthly Rank Reset",
	priority: 1,
	condition: (minutes, now) => minutes % (60 * 24) == 0 && now.getUTCDate() == 1, // 1st of the month, at 00:00 UTC
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const previousLeaderboard = Rank.getLeaderboard(logger, bot.settings);
		const role = await guild.roles.fetch(bot.settings.application.commands.rank.firstOfTheMonthRole);

		if (role) {
			if (role.members) for (const member of role.members.values()) await member.roles.remove(role);
			const channel = await guild.channels.fetch(bot.settings.application.commands.rank.channel);

			if (previousLeaderboard.firstOfTheMonth) {
				try {
					const firstMember = await guild.members.fetch(previousLeaderboard.firstOfTheMonth.id);
					await firstMember.roles.add(role);

					if (channel && channel.isSendable()) {
						try {
							await channel.send({
								content: `# New <@&${bot.settings.application.commands.rank.firstOfTheMonthRole}>!\n<@${previousLeaderboard.firstOfTheMonth.id}> was first of the monthly leaderboard and got the <@&${bot.settings.application.commands.rank.firstOfTheMonthRole}> role!\n\n**Send some love to <@${previousLeaderboard.firstOfTheMonth.id}> in <#${bot.settings.application.commands.rank.defaultTextChannel}>!**\n-# <@${previousLeaderboard.firstOfTheMonth.id}> won with ${previousLeaderboard.firstOfTheMonth.points.toFixed(2)} points this month.`,
								allowedMentions: {
									users: [previousLeaderboard.firstOfTheMonth.id]
								}
							});
						} catch (e) {
							logger.warn("Failed to ping new Elite of the Month:", e);
						}
					} else logger.error("Failed to ping new Elite of the Month: invalid channel");
				} catch (e) {
					logger.error(`Failed to add ${role.name} (${role.id}):`, e);
				}
			}
		}

		await Rank.resetLeaderboard(logger, bot.settings);
	}
};

module.exports = cron;