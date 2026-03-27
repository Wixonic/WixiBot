import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	MessageFlags,
	type MessageContextMenuCommandInteraction
} from "discord.js";

import { client, type Command } from "../lib/client.ts";

export const command = {
	data: new ContextMenuCommandBuilder()
		.setName("Report Message")
		.setType(ApplicationCommandType.Message)
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

		const targetMessage = interaction.targetMessage;

		if (!targetMessage) {
			await interaction.deleteReply();
			throw new Error("Message not found");
		}

		await guild.reportMessage(targetMessage, interaction.member);

		await interaction.editReply({
			content: "Message reported successfully."
		});
	}
} satisfies Command<MessageContextMenuCommandInteraction>;