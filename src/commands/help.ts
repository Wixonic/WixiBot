import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Command } from "../lib/client.ts";
import { displayCommand, chunkMessage } from "../lib/utils.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Need help?")
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
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const guildCommands = interaction.guild?.commands ? await interaction.guild.commands.fetch() : null;
		const globalCommands = await interaction.client.application?.commands.fetch();

		const globalSlashCommandList: string[] = [];
		if (globalCommands) {
			for (const command of globalCommands.values()) {
				if (command.type === ApplicationCommandType.ChatInput) globalSlashCommandList.push(displayCommand(command));
			}
		}

		const guildSlashCommandList: string[] = [];
		if (guildCommands) {
			for (const command of guildCommands.values()) {
				if (command.type === ApplicationCommandType.ChatInput) guildSlashCommandList.push(displayCommand(command));
			}
		}

		const sections: string[] = [];

		sections.push(`## Global Commands\n${globalSlashCommandList.length > 0 ? globalSlashCommandList.join("\n") : "*No global commands available.*"}`);
		if (interaction.guild) sections.push(`## Guild Commands in ${interaction.guild.name}\n${guildSlashCommandList.length > 0 ? guildSlashCommandList.join("\n") : "*No guild-specific commands available.*"}`);
		sections.push(`-# Guild commands are only available in their respective server.`);

		const fullMessage = sections.join("\n\n");
		const chunks = chunkMessage(fullMessage, 2000);

		for (const chunk of chunks) {
			await interaction.followUp({
				content: chunk
			});
		}
	}
} satisfies Command;