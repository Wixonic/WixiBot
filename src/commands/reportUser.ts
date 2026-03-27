import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
	type UserContextMenuCommandInteraction
} from "discord.js";

import { client, type Command } from "../lib/client.ts";

export const command = {
	data: new ContextMenuCommandBuilder()
		.setName("Report User")
		.setType(ApplicationCommandType.User)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		]),
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

		await guild.reportUser(targetMember, interaction.member);

		await interaction.editReply({
			content: "User reported successfully."
		});
	}
} satisfies Command<UserContextMenuCommandInteraction>;