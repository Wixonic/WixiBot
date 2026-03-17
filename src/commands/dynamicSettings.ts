import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { generateDynamicSettingsComponentFor } from "../lib/dynamicSettings.ts";
// import { userSettingsSchema } from "../lib/user.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("settings")
		.setDescription("View and modify your settings.")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel
		]),

	async execute(logger, interaction) {
		await interaction.reply({
			components: [
				await generateDynamicSettingsComponentFor(logger, "", interaction)
			],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
		});
	}
} satisfies Command<ChatInputCommandInteraction>;