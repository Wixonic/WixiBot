import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("moderation")
		.setDescription("Manage moderation tasks")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		])
		.addSubcommand((subcommand) => subcommand
			.setName("warn")
			.setDescription("Warn a user")
			.addUserOption((option) => option
				.setName("user")
				.setDescription("The user to warn")
				.setRequired(true)
			)
		),

	async execute(_logger, interaction) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		switch (interaction.options.getSubcommand(true)) {
			case "warn": {
				await interaction.editReply({
					content: "This subcommand is not implemented yet."
				});
				break;
			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown subcommand");
			}
		}
	}
} satisfies Command<ChatInputCommandInteraction>;