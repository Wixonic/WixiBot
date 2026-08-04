import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { getFundingMessage } from "../lib/fundingMessage.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("funding")
		.setDescription("Support my work!")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		]),

	async execute(_logger, interaction) {
		try {
			const fundingComponents = await getFundingMessage(interaction.guildId!);

			await interaction.reply({
				components: fundingComponents,
				flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
			});
		} catch {
			await interaction.reply({
				content: "Funding is currently unavailable. Please try again later.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
} satisfies Command<ChatInputCommandInteraction>;