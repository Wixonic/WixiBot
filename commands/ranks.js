const { ApplicationCommandType, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("discord.js");

const { Rank, getRank } = require("../lib/ranks.js");

const { displayTime } = require("../utils.js");

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
				.setName("achievements")
				.setDescription("Displays all achievements")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("leaderboard")
				.setDescription("Displays the top 10")
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
				await interaction.editReply({
					content: `Rank: ${userRank.rankText}\nYou have ${userRank.achievements.length == 0 ? "no" : (userRank.achievements.length == 1 ? "one" : userRank.achievements.length)} achievement${userRank.achievements.length > 1 ? "s" : ""}, and ${userRank.points == 0 ? "no" : (userRank.points == 1 ? "one" : userRank.points)} point${userRank.points > 1 ? "s" : ""}.\n### Stats\n- Messages sent: ${userRank.messages}\n- Time spent in voice channels: ${displayTime(userRank.voice.time)}, in ${userRank.voice.count} times\n- Time spent streaming in voice channels: ${displayTime(userRank.voice.stream.time)}, in ${userRank.voice.stream.count} times`,
					flags: MessageFlags.Ephemeral
				});
				break;

			case "achievements":
				const achievements = (rankSettings?.achievements ?? []).map((achievement) => `- ${userRank.achievements.includes(achievement.id) ? "✅" : "❌"} ${achievement.name} (${achievement.points} points): ${achievement.description}`);

				await interaction.editReply({
					content: `### Your achievements\n${achievements.join("\n")}`,
					flags: MessageFlags.Ephemeral
				});
				break;

			case "leaderboard":
				const leaderboard = Rank.leaderboard(interaction.guildId);

				if (leaderboard.length > 0) {
					const top10 = leaderboard.slice(0, 10).map((user, index) => `${index + 1}. <@${user.id}> - ${user.points} points`);

					await interaction.editReply({
						content: `### Top 10 members\n${top10.join("\n")}\n\n-# Updated at <t:${Math.floor(Date.now() / 1000)}:f>`,
						flags: MessageFlags.Ephemeral
					});
				} else await interaction.editReply({
					content: "No members found in the leaderboard.",
					flags: MessageFlags.Ephemeral
				});
				break;

			case "roles":
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