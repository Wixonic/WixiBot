import {
	ApplicationIntegrationType,
	ChannelType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type StageChannel,
	type VoiceChannel
} from "discord.js";

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
			.setDescription("The channel to move users from")
			.addChannelTypes(ChannelType.GuildStageVoice, ChannelType.GuildVoice)
			.setRequired(true)
		)
		.addChannelOption((option) => option
			.setName("to")
			.setDescription("The channel to move users to")
			.addChannelTypes(ChannelType.GuildStageVoice, ChannelType.GuildVoice)
			.setRequired(true)
		),

	async execute(logger, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const from = interaction.options.getChannel("from", true) as StageChannel | VoiceChannel;
		const to = interaction.options.getChannel("to", true) as StageChannel | VoiceChannel;

		const members = from.members;
		const failed = [];

		const movePromises = Array.from(members.values()).map(member => 
			member.voice.setChannel(to)
				.then(() => ({ status: "fulfilled" as const, member }))
				.catch(error => {
					logger.warn(`Failed to move member ${member.user.username} (${member.user.id}) from ${from.name} (${from.id}) to ${to.name} (${to.id})${interaction.guild ? ` in ${interaction.guild.name} (${interaction.guild.id})` : ""}`, error);
					return { status: "rejected" as const, member };
				})
		);

		const results = await Promise.allSettled(movePromises);
		for (const result of results) {
			if (result.status === "fulfilled" && result.value.status === "rejected") {
				failed.push(result.value.member);
			}
		}

		if (failed.length === 0) await interaction.deleteReply();
		else await interaction.followUp({
			content: `Moved ${members.size - failed.length}/${members.size} member${members.size !== 1 ? "s" : ""}. Failed to move: ${failed.map((member) => `- <@${member.user.id}>`).join("\n")}`
		});
	}
} satisfies Command<ChatInputCommandInteraction>;