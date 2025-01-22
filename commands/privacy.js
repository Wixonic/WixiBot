const { ApplicationCommandType, MessageFlags, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

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
		const privacySettings = settings.guilds[interaction.guildId]?.privacy;

		if (!privacySettings?.active) {
			interaction.log("Privacy link disabled");
			return await interaction.reply({
				content: "Privacy link is currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		await interaction.reply({
			content: "Check our Privacy Policy [here](<https://wixonic.fr/privacy/>).",
			flags: MessageFlags.Ephemeral
		});

		interaction.log("Link to Privacy Policy sent");
	}
};