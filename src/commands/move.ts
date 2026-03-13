import { ApplicationIntegrationType, ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, type StageChannel, type VoiceChannel } from "discord.js";

import type { Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("move")
		.setDescription("Move all users from a channel to another")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		])
		.setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)

		.addChannelOption((option) => option
			.setName("from")
			.addChannelTypes(ChannelType.GuildVoice)
			.setDescription("The channel to move users from")
			.setRequired(true)
		)
		.addChannelOption((option) => option
			.setName("to")
			.addChannelTypes(ChannelType.GuildVoice)
			.setDescription("The channel to move users to")
			.setRequired(true)
		),

	async execute(_logger, _client, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const from = interaction.options.getChannel("from") as StageChannel | VoiceChannel;
		const to = interaction.options.getChannel("to") as StageChannel | VoiceChannel;

		for (const member of from.members.values()) member.voice.setChannel(to);

		await interaction.deleteReply();
	}
} satisfies Command;