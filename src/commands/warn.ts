import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	type UserContextMenuCommandInteraction
} from "discord.js";

import { client, type Command } from "../lib/client.ts";

export const command = {
	data: new ContextMenuCommandBuilder()
		.setName("Warn")
		.setType(ApplicationCommandType.User)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		])
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
	async execute(_logger, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		if (!interaction.guild) {
			await interaction.deleteReply();
			throw new Error("This command can only be used in a guild");
		}

		const guild = await client.getGuild(interaction.guild.id);
		if (!guild) {
			await interaction.deleteReply();
			throw new Error("Guild not found");
		}

		const targetMember = await interaction.guild.members.fetch(interaction.targetId);
		if (!targetMember) {
			await interaction.deleteReply();
			throw new Error("User not found");
		}

		await guild.warn(targetMember, interaction.member, "No reason provided");

		await interaction.editReply({
			content: "User warned successfully."
		});
	}
} satisfies Command<UserContextMenuCommandInteraction>;