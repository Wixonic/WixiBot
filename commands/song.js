const { ApplicationCommandType, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "song",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Do you need help with something?"),
	execute: async (interaction) => {
		const guildSettings = settings?.guilds?.[interaction.guildId];

		if (!guildSettings?.song?.active) {
			interaction.log("Song disabled");
			return await interaction.reply({
				content: "Song command is currently disabled",
				ephemeral: true
			});
		}

		await interaction.reply({
			content: "Under development",
			ephemeral: true
		});

		interaction.log("Song info sent");
	}
};