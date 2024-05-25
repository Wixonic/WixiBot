const { ApplicationCommandType, SlashCommandBuilder } = require("discord.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	data: new SlashCommandBuilder()
		.setName("echo")
		.setDescription("This is an echo"),
	execute: async (interaction) => {
		await interaction.reply({
			content: "ECHO\nEcho\necho",
			ephemeral: true
		});
	},
	name: "echo",
	type: ApplicationCommandType.ChatInput
};