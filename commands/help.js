const { ApplicationCommandType, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "help",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Do you need help with something?"),
	execute: async (interaction) => {
		const helpSettings = settings.guilds[interaction.guildId].help;

		if (!helpSettings.active) {
			interaction.log("Disabled");
			return await interaction.reply({
				content: "Help is currenlty disabled",
				ephemeral: true
			});
		}

		await interaction.reply({
			content: `If you need help with something related to the server, create a post in <#${helpSettings.channel}>.\nIf you need help in real life, please contact the authorities or health services in your location.`,
			ephemeral: true
		});

		interaction.log("Sent");
	}
};