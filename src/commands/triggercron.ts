import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
	MessageFlags
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { getSettings } from "../lib/settings.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("triggercron")
		.setDescription("Manually trigger a cron job (Admin only).")
		.addStringOption(option =>
			option.setName("job")
				.setDescription("The name of the job to trigger.")
				.setRequired(true)
		)
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
		if (interaction.user.id !== getSettings().discord.ownerId) {
			await interaction.reply({ content: "You do not have permission to use this command.", flags: MessageFlags.Ephemeral });
			return;
		}

		const jobName = interaction.options.getString("job", true);

		try {
			// Find the job module dynamically
			const moduleUrl = new URL(`../jobs/${jobName}.ts`, import.meta.url).href;
			const module = await import(moduleUrl);

			if ("job" in module) {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				await module.job.execute(_logger);

				await interaction.followUp(`Successfully executed job: **${jobName}**.`);
			} else {
				await interaction.reply({ content: `Job **${jobName}** not found or invalid.`, flags: MessageFlags.Ephemeral });
			}
		} catch (error) {
			_logger.error(`Failed to manually trigger job ${jobName}`, { cause: error });

			if (interaction.deferred) {
				await interaction.followUp(`Failed to execute job: **${jobName}**. Check logs for details.`);
			} else {
				await interaction.reply({ content: `Failed to execute job: **${jobName}**. It might not exist.`, flags: MessageFlags.Ephemeral });
			}
		}
	}
} satisfies Command<ChatInputCommandInteraction>;
