const { ApplicationCommandType, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("discord.js");

const { Rank, getRank } = require("../lib/ranks.js");

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
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("leaderboard")
				.setDescription("Displays the top 10")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("roles")
				.setDescription("List all available roles")
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

		const userRank = await getRank(interaction.guildId, interaction.member.id);

		switch (subcommand) {
			case "me":
				if (userRank) await interaction.editReply({
					content: await userRank.description(),
					flags: MessageFlags.Ephemeral
				}); else await interaction.editReply({
					content: "Member not found.",
					flags: MessageFlags.Ephemeral
				});
				break;

			case "leaderboard":
				const leaderboard = await Rank.leaderboard(interaction.guildId);

				if (leaderboard.global.length > 0 && leaderboard.month.length > 0) {
					const globalTop10 = leaderboard.global.slice(0, 10).map((user, index) => `${index + 1}. <@${user.id}> - ${Math.ceil(user.points)} points`);
					const monthlyTop10 = leaderboard.month.slice(0, 10).map((user, index) => `${index + 1}. <@${user.id}> - ${Math.ceil(user.points)} points`);

					await interaction.editReply({
						content: `### Global Top 10 members\n${globalTop10.join("\n")}\n### Monthly Top 10 members\n${monthlyTop10.join("\n")}`,
						flags: MessageFlags.Ephemeral
					});
				} else await interaction.editReply({
					content: "No members found in the leaderboard.",
					flags: MessageFlags.Ephemeral
				});
				break;

			case "roles":
				const roles = [];
				for (const role in rankSettings?.roles) roles.push(`- <@&${role}>: ${rankSettings?.roles[role] ?? 0} point${(rankSettings?.roles[role.id] ?? 0) == 1 ? "" : "s"}`);
				await interaction.editReply({
					content: `## Rank roles\n${roles.length > 1 ? roles.join("\n") : "No roles available right now."}`,
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