const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * @type {CommandInfo}
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
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		options: [
			{
				type: ApplicationCommandOptionType.Channel,
				name: "channel",
				description: "The channel where the rules will be published",
				channel_types: [
					ChannelType.GuildAnnouncement,
					ChannelType.GuildText
				],
				required: true
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const rulesPath = path.join(__dirname, "..", "settings", bot.application.id, "rules.md");
		const rulesMessage = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf-8") : null;

		if (rulesMessage) {
			/**
			 * @type {import("discord.js").TextBasedChannel}
			 */
			const channel = interaction.options.getChannel("channel");
			await channel.send(rulesMessage);
			await interaction.editReply("Rules updated");
		} else logger.error("Rules file missing.");
	}
};

module.exports = info;