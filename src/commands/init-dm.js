const { ApplicationCommandType, InteractionContextType, MessageFlags } = require("discord.js");

/**
 * @type {CommandInfo}
 */
const info = {
	name: "Init DM",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "init-dm",
		description: "Initialize a DM for this user",
		contexts: [
			InteractionContextType.BotDM
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const dmChannel = await interaction.user.createDM();
		dmChannel.send({
			content: `<｜Clear｜>\nThis message resets the conversation.`,
			flags: MessageFlags.SuppressNotifications
		});

		await interaction.editReply("DM initialized! Keep in mind that you need to initialize them again when the bot restarts.");
	}
};

module.exports = info;