const { ApplicationCommandType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const Settings = require("../lib/settings.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Rules",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "rules",
		description: "Publishes the server rules in the specified channel",
		contexts: [
			InteractionContextType.Guild
		],
		default_member_permissions: PermissionFlagsBits.Administrator.toString()
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const settings = Settings.get(bot.user.id);

		const rulesPath = path.join(__dirname, "..", "settings", bot.application.id, "rules.md");
		const rulesMessage = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf-8") : null;

		if (rulesMessage) {
			const channel = await bot.channels.fetch(settings.application.commands.rules.channel);

			if (channel && channel.isTextBased() && channel.isSendable()) {
				await channel.send({
					content: rulesMessage,
					flags: MessageFlags.SuppressNotifications
				});

				await interaction.followUp(`Rules published at <#${channel.id}>.`);
			} else logger.error("Invalid channel");
		} else logger.error("Rules file missing");
	}
};

module.exports = info;