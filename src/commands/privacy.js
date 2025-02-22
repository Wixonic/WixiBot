const { ApplicationCommandType, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Privacy",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "privacy",
		description: "Learn how we collect, manage, store and delete your personal data"
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const privacyPath = path.join(__dirname, "..", "settings", bot.application.id, "privacy.md");
		const privacyMessage = fs.existsSync(privacyPath) ? fs.readFileSync(privacyPath, "utf-8") : null;

		if (privacyMessage) await interaction.followUp(privacyMessage);
		else logger.error("Privacy file missing");
	}
};

module.exports = info;