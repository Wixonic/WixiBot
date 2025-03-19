const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");

const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Leaderboard",
	mode: "guild",
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

		const leaderboard = Rank.getLeaderboard(logger, bot.settings);

		const monthLeaderboard = [];
		const globalLeaderboard = [];

		for (const member of leaderboard.month.slice(0, 10)) monthLeaderboard.push(`- <@${member.id}>: ${Math.ceil(member.points)} points`);
		for (const member of leaderboard.global.slice(0, 10)) globalLeaderboard.push(`- <@${member.id}>: ${Math.ceil(member.points)} points`);

		await interaction.followUp(`# Leaderboard\n> The first member of each month's leaderboard will receive an unique <@&${bot.settings.application.commands.rank.firstOfTheMonthRole}> role!\n\n## Month Leaderboard\n${monthLeaderboard.join("\n")}\n## Global Leaderboard\n${globalLeaderboard.join("\n")}\n\n-# Last update: <t:${Math.floor(leaderboard.updatedAt / 1000)}:R>`);
	}
};

module.exports = info;