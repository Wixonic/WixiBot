import { ApplicationCommandType, ApplicationIntegrationType, ContainerBuilder, ContextMenuCommandBuilder, InteractionContextType, LabelBuilder, MessageFlags, ModalBuilder, SectionBuilder, TextDisplayBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import type { Command } from "../lib/client.ts";
import { parseDuration } from "../lib/utils.ts";

export const command = {
	data: new ContextMenuCommandBuilder()
		.setName("Remind me")
		.setType(ApplicationCommandType.Message)
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
		if (!interaction.isMessageContextMenuCommand()) return;

		const modal = new ModalBuilder()
			.setCustomId(`${command.data.name}_${interaction.targetMessage.id}`)
			.setTitle("Set a reminder");

		const durationInput = new LabelBuilder()
			.setLabel("Duration")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("duration")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("3 days")
					.setRequired(true)
			);

		const reasonInput = new LabelBuilder()
			.setLabel("Reason (optional)")
			.setTextInputComponent(
				new TextInputBuilder()
					.setCustomId("reason")
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder("Why do you want to be reminded?")
					.setRequired(false)
			);

		modal.addLabelComponents(durationInput, reasonInput);

		await interaction.showModal(modal);
	},

	async onModalSubmit(_logger, _client, interaction) {
		const durationString = interaction.fields.getTextInputValue("duration");
		const reason = interaction.fields.getTextInputValue("reason") || "No reason provided";
		const messageId = interaction.customId.split("_")[1];

		const durationMilliseconds = parseDuration(durationString);
		if (!durationMilliseconds) {
			await interaction.reply({
				content: `Invalid duration format: **${durationString}**\nPlease use something like \`10s\`, \`5m\`, or \`1h\`.`,
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		await interaction.reply({
			content: `I'll remind you in **${durationString}**.`,
			flags: MessageFlags.Ephemeral
		});
	}
} satisfies Command;