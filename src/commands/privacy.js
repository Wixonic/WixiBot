const { ApplicationCommandType, MessageFlags } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Privacy",
	mode: "global",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "privacy",
		description: "Learn how we collect, manage, store and delete your personal data"
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const privacyMessage = fs.existsSync(bot.settings.paths.markdown.privacy) ? fs.readFileSync(bot.settings.paths.markdown.privacy, "utf-8") : null;

		if (privacyMessage) await interaction.followUp(privacyMessage);
		else logger.error("Privacy file missing");
	}
};

module.exports = info;