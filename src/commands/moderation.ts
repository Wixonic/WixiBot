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
				await interaction.editReply({ content: `User <@${member.id}> has been warned.` });
				break;
			}

			case "info": {
				const providedUser = interaction.options.getUser("user", true);
				const history = await guild.getModerationHistory(providedUser.id);

				const warningsList = history.warnings.length > 0 ? history.warnings.map((warn) => `- <t:${Math.floor(new Date(warn.date).getTime() / 1000)}:R>: **${warn.reason}**${warn.by ? ` (by <@${warn.by}>)` : ""}`).join("\n") : "No warnings recorded.";
				const reportsList = history.reports.length > 0 ? history.reports.map((report) => `- <t:${Math.floor(new Date(report.date).getTime() / 1000)}:R> [${report.type}]: **${report.reason || "No reason"}**${report.by ? ` (by <@${report.by}>)` : ""}`).join("\n") : "No reports recorded.";
				await interaction.editReply(`## Moderation History for <@${providedUser.id}>\n\n### Warnings (${history.warnings.length}):\n${warningsList}\n\n### Reports (${history.reports.length}):\n${reportsList}`);
				break;
			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown subcommand");
			}
		}
	}
} satisfies Command<ChatInputCommandInteraction>;