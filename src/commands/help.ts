import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { displayCommand, sendChunks } from "../lib/utils.ts";
import { getSettings } from "../lib/settings.ts";

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

	async execute(_logger, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const settings = getSettings();

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
		sections.push(`**If you need help, feel free to ask in ${settings.links?.help ?? "<https://go.wixonic.fr/help>"}**`);

		await sendChunks(sections.join("\n\n"), interaction.followUp.bind(interaction));
	}
} satisfies Command<ChatInputCommandInteraction>;