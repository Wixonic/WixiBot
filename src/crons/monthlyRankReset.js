const { MessageFlags } = require("discord.js");

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
		const previousLeaderboard = Rank.getLeaderboard(logger, bot);
		const role = await guild.roles.fetch(bot.settings.application.commands.ranks.eliteOfTheMonthRole);

		if (role) {
			if (role.members) for (const member of role.members.values()) await member.roles.remove(role);
			const channel = await guild.channels.fetch(bot.settings.application.commands.ranks.channel);

			if (previousLeaderboard.eliteOfTheMonth) {
				try {
					const firstMember = await guild.members.fetch(previousLeaderboard.eliteOfTheMonth.id);
					await firstMember.roles.add(role);

					if (channel && channel.isSendable()) {
						try {
							const rank = Rank.get(logger, bot, firstMember.id);
							await rank.addElite(now);
							await channel.send({
								allowedMentions: {
									users: [previousLeaderboard.eliteOfTheMonth.id]
								},
								content: `# New <@&${bot.settings.application.commands.ranks.eliteOfTheMonthRole}>!\n<@${previousLeaderboard.eliteOfTheMonth.id}> was first of the monthly leaderboard and got the <@&${bot.settings.application.commands.ranks.eliteOfTheMonthRole}> role!\n\n**Send some love to <@${previousLeaderboard.eliteOfTheMonth.id}> in <#${bot.settings.application.defaultTextChannel}>!**\n-# <@${previousLeaderboard.eliteOfTheMonth.id}> won with ${previousLeaderboard.eliteOfTheMonth.points.toFixed(2)} points this month.`,
								flags: process.env.silent == "true" ? MessageFlags.SuppressNotifications : null
							});
						} catch (e) {
							logger.warn(e);
						}
					} else logger.error("Invalid channel");
				} catch (e) {
					logger.error(`Failed to add ${role.name} (${role.id}):`, e);
				}
			}
		}

		await Rank.resetLeaderboard(logger, bot);
	}
};

module.exports = cron;