const { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } = require("discord.js");

const { getRank } = require("../lib/ranks.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").UserCommand}
 */
module.exports = {
	name: "rank",
	type: ApplicationCommandType.User,
	data: new ContextMenuCommandBuilder()
		.setName("rank")
		.setType(ApplicationCommandType.User),
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

		const rank = await getRank(interaction.guildId, interaction.targetId);
		await interaction.editReply({
			content: `<@${interaction.targetId}> has ${rank.achievements.length == 0 ? "no" : (rank.achievements.length == 1 ? "one" : rank.achievements.length)} achievement${rank.achievements.length > 1 ? "s" : ""}, and ${rank.points == 0 ? "no" : (rank.points == 1 ? "one" : rank.points)} point${rank.points > 1 ? "s" : ""}.`,
			flags: MessageFlags.Ephemeral
		});
	}
};