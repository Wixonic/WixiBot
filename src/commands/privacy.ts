import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("privacy")
		.setDescription("Learn more about our privacy policy")
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
		await interaction.reply({
			content: `We are committed to protecting your privacy.
We do not collect data when we don't need to.
However, some data are always collected, and can be logged in our systems.

If you want to ask for the deletion of your data, contact us at <privacy@wixonic.fr>.

If you want to know more about the data we collect, read our privacy policy by clicking the button below.`,
			components: [
				new ActionRowBuilder<ButtonBuilder>()
					.addComponents(
						new ButtonBuilder()
							.setLabel("Privacy Policy")
							.setURL("https://discord.wixonic.fr/privacy/")
							.setStyle(ButtonStyle.Link)
					)
			],
			flags: MessageFlags.Ephemeral
		});
	}
} satisfies Command;