import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, ContainerBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Command } from "../lib/client.ts";
import { getSettings } from "../lib/settings.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("funding")
		.setDescription("Support the project by making a donation and unlocking exclusive perks!")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel
		]),

	async execute(_logger, _client, interaction) {
		const settings = getSettings();
		const fundingSku = settings.discord.sku.funding;

		if (!fundingSku) {
			await interaction.reply({
				content: "Funding is currently unavailable. Please try again later.",
				flags: MessageFlags.Ephemeral
			});
		} else {
			await interaction.reply({
				components: [
					new ContainerBuilder()
						.addTextDisplayComponents((component) => component
							.setContent(`# Support my work!
Money doesn’t grow on trees, and neither does quality content!
If you want to support my projects, make a donation.`)
						)
						.addActionRowComponents((component) => component
							.addComponents(
								new ButtonBuilder()
									.setStyle(ButtonStyle.Premium)
									.setSKUId(fundingSku)
							)
						)
						.addTextDisplayComponents((component) => component
							.setContent(`In exchange for your investment, you’ll immediately unlock a series of exclusive perks.
It’s a win-win deal!`)
						)
				],
				flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
			});
		}
	}
} satisfies Command<ChatInputCommandInteraction>;