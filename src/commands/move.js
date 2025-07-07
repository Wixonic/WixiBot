const { ApplicationCommandType, ApplicationCommandOptionType, BaseGuildVoiceChannel, ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Move",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "move",
		description: "Move all members from a channel to another",
		default_member_permissions: PermissionFlagsBits.MoveMembers.toString(),
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.Channel,
				name: "from",
				description: "The voice channel to move members from.",
				channel_types: [ChannelType.GuildVoice],
				required: true
			}, {
				type: ApplicationCommandOptionType.Channel,
				name: "to",
				description: "The voice channel to move members to.",
				channel_types: [ChannelType.GuildVoice],
				required: true
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		/**
		 * @type {BaseGuildVoiceChannel}
		 */
		const from = interaction.options.getChannel("from");
		const to = interaction.options.getChannel("to");

		for (const member of from.members.values()) member.voice.setChannel(to);

		await interaction.deleteReply();
	}
};

module.exports = info;