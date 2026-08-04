import {
	ActionRowBuilder,
	ApplicationCommandType,
	ApplicationIntegrationType,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContextMenuCommandBuilder,
	InteractionContextType,
	type Message,
	type MessageActionRowComponentBuilder,
	type MessageContextMenuCommandInteraction
} from "discord.js";

import { AIService } from "../lib/ai.ts";
import type { Command } from "../lib/client.ts";

export const command = {
	data: new ContextMenuCommandBuilder()
		.setName("Fact Check Message")
		.setType(ApplicationCommandType.Message)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		]),
	async execute(logger, interaction) {
		const targetMessage = interaction.targetMessage;

		if (!targetMessage) throw new Error("Message not found");

		logger.debug(`Fact checking message ${targetMessage.id} in channel ${interaction.channelId}`);

		const initialContent = `Currently fact-checking this message: ${targetMessage.url}\nStarted <t:${Math.floor(Date.now() / 1000)}:R>\n-# ${AIService.disclaimer}`;
		await interaction.reply({ content: initialContent });

		const messageMap = new Map<string, Message>();
		messageMap.set(targetMessage.id, targetMessage);

		let currentMessage: Message = targetMessage;
		while (currentMessage.reference) {
			const parentMessage = await currentMessage.fetchReference().catch(() => null);
			if (!parentMessage || messageMap.has(parentMessage.id)) break;
			messageMap.set(parentMessage.id, parentMessage);
			currentMessage = parentMessage;
		}

		const oldestMessage = currentMessage;
		if (interaction.channel && "messages" in interaction.channel) {
			logger.debug(`Fetching up to 30 messages in channel ${interaction.channelId} before oldest message ${oldestMessage.id}...`);
			const fetched = await interaction.channel.messages.fetch({ limit: 30, before: oldestMessage.id }).catch((error) => {
				logger.warn(`Failed to fetch preceding channel messages before ${oldestMessage.id}`, { cause: error });
				return null;
			});

			if (fetched && fetched.size > 0) {
				logger.debug(`Fetched ${fetched.size} channel messages before oldest message ${oldestMessage.id}`);
				for (const message of fetched.values()) messageMap.set(message.id, message);
			} else logger.debug("No preceding channel messages returned.");
		}

		const messages = Array.from(messageMap.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

		const service = new AIService();
		const conversation = service.parseConversation(messages);
		logger.debug(`Fact check conversation prepared with ${conversation.length} messages.`);

		const { summary, report } = await service.factCheck(conversation);

		const responseData = {
			content: `${summary}\n-# ${AIService.disclaimer}`,
			files: report ? [new AttachmentBuilder(Buffer.from(report, "utf-8"), { name: "Report.md" })] : [],
			components: [
				new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId("factCheck:great")
						.setLabel("Great answer")
						.setStyle(ButtonStyle.Secondary),
					new ButtonBuilder()
						.setCustomId("factCheck:wrong")
						.setLabel("Looks wrong")
						.setStyle(ButtonStyle.Secondary)
				)
			]
		};

		await interaction.editReply(responseData);
		logger.debug(`Fact check response sent successfully for message ${targetMessage.id}`);
	}
} satisfies Command<MessageContextMenuCommandInteraction>;