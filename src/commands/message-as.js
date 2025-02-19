const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Message As",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "message-as",
		description: "Sends a message as the bot in the specified channel",
		default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "content",
				description: "The content of the message to be sent",
				required: true
			}, {
				type: ApplicationCommandOptionType.Channel,
				name: "channel",
				description: "The channel where the message will be sent",
				required: true,
				channel_types: [
					ChannelType.GuildAnnouncement,
					ChannelType.GuildText
				]
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

		const content = interaction.options.getString("content");
		const channel = interaction.options.getChannel("channel");

		await channel.send(content);
		await interaction.deleteReply();
	}
};

module.exports = info;