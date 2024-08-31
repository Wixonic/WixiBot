const { ApplicationCommandType, SlashCommandBuilder } = require("discord.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "privacy",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("privacy")
		.setDescription("Learn how we collect, manage, store and delete your personal data."),
	execute: async (interaction) => {
		await interaction.reply({
			content: "Check our Privacy Policy [here](<https://wixonic.fr/privacy/>).",
			ephemeral: true
		});

		interaction.log("Link to Privacy Policy sent");
	}
};