import {
	ApplicationIntegrationType,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ContainerBuilder,
	InteractionContextType,
	MessageFlags,
	SeparatorSpacingSize,
	SlashCommandBuilder
} from "discord.js";

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

	async execute(_logger, interaction) {
		await interaction.reply({
			components: [
				new ContainerBuilder()
					.addTextDisplayComponents((component) => component
						.setContent(`# We are committed to protecting your privacy
We do not collect data when we don't need to.
However, **some data are always collected**, and can be logged in our systems.`)
					)
					.addSeparatorComponents((component) => component
						.setSpacing(SeparatorSpacingSize.Large)
					)
					.addTextDisplayComponents((component) => component
						.setContent(`If you want to know more about the data we collect, read our privacy policy.`)
					)
					.addActionRowComponents((component) => component
						.addComponents([
							new ButtonBuilder()
								.setLabel("Privacy Policy")
								.setURL("https://discord.wixonic.fr/privacy/")
								.setStyle(ButtonStyle.Link)
						])
					)
					.addSeparatorComponents((component) => component
						.setSpacing(SeparatorSpacingSize.Large)
					)
					.addTextDisplayComponents((component) => component
						.setContent(`
If you want to delete your data saved by the Application, use the button below.`)
					)
					.addActionRowComponents((component) => component
						.addComponents([
							new ButtonBuilder()
								.setCustomId("privacy:delete")
								.setLabel("Delete my data")
								.setStyle(ButtonStyle.Danger)
						])
					)
					.addSeparatorComponents((component) => component
						.setSpacing(SeparatorSpacingSize.Large)
					)
					.addTextDisplayComponents((component) => component
						.setContent(`If you want to **delete** or **request all your data**, contact us at <privacy@wixonic.fr>.
We will process your request as soon as possible.
Please note that we may need to verify your identity before processing your request, and that we may need to keep some data for legal purposes.`)
					)
			],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
		});
	}
} satisfies Command<ChatInputCommandInteraction>;