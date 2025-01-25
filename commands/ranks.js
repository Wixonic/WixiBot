const { ApplicationCommandType, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("discord.js");

const { getRank } = require("../lib/ranks.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "ranks",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("ranks")
		.setDescription("Details about ranks")
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("me")
				.setDescription("Displays your rank data")
		),
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const rankSettings = settings.guilds?.[interaction.guildId]?.ranks;

		if (!rankSettings?.active) {
			interaction.log("Ranks disabled");
			return await interaction.reply({
				content: "Ranks are currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		const subcommand = interaction.options.getSubcommand();

		interaction.log(`/ranks ${subcommand}`);

		switch (subcommand) {
			case "me":
				const rank = await getRank(interaction.guildId, interaction.member.id);
				await interaction.editReply({
					content: `You have ${rank.achievements.length == 0 ? "no" : (rank.achievements.length == 1 ? "one" : rank.achievements.length)} achievement${rank.achievements.length > 1 ? "s" : ""}, and ${rank.points == 0 ? "no" : (rank.points == 1 ? "one" : rank.points)} point${rank.points > 1 ? "s" : ""}.`,
					flags: MessageFlags.Ephemeral
				});
				break;

			case "leaderboard":
				await interaction.editReply({
					content: "Leaderboard is not available right now.",
					flags: MessageFlags.Ephemeral
				});
				break;

			default:
				interaction.log(`Unknown subcommand "${interaction.options.getSubcommand()}"`);
				await interaction.editReply({
					content: `Unknown subcommand "${interaction.options.getSubcommand()}"`,
					flags: MessageFlags.Ephemeral
				});
				break;
		};
	}
};