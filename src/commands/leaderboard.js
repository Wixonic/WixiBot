const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");

const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Leaderboard",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "leaderboard",
		description: "Displays leaderboard",
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const leaderboard = Rank.getLeaderboard(logger, bot);

		const monthlyLeaderboard = [];
		const globalLeaderboard = [];

		for (const member of leaderboard.month.slice(0, 10)) {
			if (member.points > 0) monthlyLeaderboard.push(`- <@${member.id}>: ${Math.ceil(member.points)} points`);
		}
		for (const member of leaderboard.global.slice(0, 10)) {
			if (member.points > 0) globalLeaderboard.push(`- <@${member.id}>: ${Math.ceil(member.points)} points`);
		}

		await interaction.followUp({
			allowedMentions: {},
			content: `# Leaderboard\n> The top member of each month's leaderboard will receive a unique <@&${bot.settings.application.commands.ranks.firstOfTheMonthRole}> role!\n## Monthly Leaderboard\n${monthlyLeaderboard.join("\n")}\n## Global Leaderboard\n${globalLeaderboard.join("\n")}\n\n-# Last updated: <t:${Math.floor(leaderboard.updatedAt / 1000)}:R>`
		});
	}
};

module.exports = info;