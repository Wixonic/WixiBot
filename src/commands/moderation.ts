import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

import { client, type Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("moderation")
		.setDescription("Execute moderation tasks")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		])
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand((subcommand) => subcommand
			.setName("warn")
			.setDescription("Warn a user")
			.addUserOption((option) => option
				.setName("user")
				.setDescription("The user to warn")
				.setRequired(true)
			)
			.addStringOption((option) => option
				.setName("reason")
				.setDescription("The reason for the warning")
				.setRequired(false)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("info")
			.setDescription("Get info about a user's moderation history")
			.addUserOption((option) => option
				.setName("user")
				.setDescription("The user to get info about")
				.setRequired(true)
			)
		),

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

		switch (interaction.options.getSubcommand(true)) {
			case "warn": {
				const providedUser = interaction.options.getUser("user", true);

				const member = await interaction.guild.members.fetch(providedUser.id);

				if (!member) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				await guild.warn(member, interaction.member, interaction.options.getString("reason") || "No reason provided");
				break;
			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown subcommand");
			}
		}
	}
} satisfies Command<ChatInputCommandInteraction>;