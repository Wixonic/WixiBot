import { ApplicationIntegrationType, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("moderation")
		.setDescription("Manage moderation tasks")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		]),

	async execute(_logger, _client, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});
	}
} satisfies Command;