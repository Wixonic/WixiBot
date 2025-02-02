const { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } = require("discord.js");

const { Rank, getRank } = require("../lib/ranks.js");

const { displayTime } = require("../utils.js");

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
		if (rank) await interaction.editReply({
			content: await rank.description(),
			flags: MessageFlags.Ephemeral
		}); else await interaction.editReply({
			content: "Invalid user.",
			flags: MessageFlags.Ephemeral
		});
	}
};