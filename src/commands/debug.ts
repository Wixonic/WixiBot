import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder
} from "discord.js";

import { client, type Command } from "../lib/client.ts";
import { syncActiveRoles } from "../jobs/checkActiveRole.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("debug")
		.setDescription("Debug and administration tools.")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		])
		.addSubcommand((subcommand) => subcommand
			.setName("job-list")
			.setDescription("List all registered background jobs.")
		)
		.addSubcommand((subcommand) => subcommand
			.setName("job-info")
			.setDescription("View details about a registered job.")
			.addStringOption((option) => option
				.setName("name")
				.setDescription("Name of the job")
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("job-run")
			.setDescription("Force execution of a background job.")
			.addStringOption((option) => option
				.setName("name")
				.setDescription("Name of the job")
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("sync-active")
			.setDescription("Force active member role synchronization for this server.")
		),

	async execute(logger, interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "job-list") {
			const jobs = client.jobs;
			if (jobs.size === 0) {
				await interaction.followUp("No jobs currently registered.");
				return;
			}

			const list = Array.from(jobs.values()).map((job) => `- **${job.name}** (\`${job.cron}\`) - ${job.enabled === false ? "Disabled" : "Active"}`).join("\n");
			await interaction.followUp(`## Registered Background Jobs (${jobs.size}):\n\n${list}`);
			return;
		}

		if (subcommand === "job-info") {
			const jobName = interaction.options.getString("name", true);
			const job = client.getJob(jobName);

			if (!job) {
				await interaction.followUp(`Job **${jobName}** not found. Use \`/debug job-list\` to view available jobs.`);
				return;
			}

			await interaction.followUp(`## Job Details: **${job.name}**\n- **Schedule (cron)**: \`${job.cron}\` \n- **Enabled**: ${job.enabled === false ? "False" : "True"}`);
			return;
		}

		if (subcommand === "job-run") {
			const jobName = interaction.options.getString("name", true);
			const job = client.getJob(jobName);

			if (!job) {
				await interaction.followUp(`Job **${jobName}** not found. Use \`/debug job-list\` to view available jobs.`);
				return;
			}

			await interaction.followUp(`Triggering execution of job **${job.name}**...`);
			try {
				await client.runJob(jobName, logger);
				await interaction.followUp(`Job **${job.name}** completed successfully!`);
			} catch (error) {
				logger.error(`Failed manual run of job ${jobName}`, { cause: error });
				await interaction.followUp(`Failed to execute job **${job.name}**: ${error instanceof Error ? error.message : String(error)}`);
			}
			return;
		}

		if (subcommand === "sync-active") {
			if (!interaction.guildId) {
				await interaction.followUp("This command must be run inside a server.");
				return;
			}

			await interaction.followUp("Running active roles synchronization for this server...");
			const result = await syncActiveRoles(logger, interaction.guildId);
			await interaction.followUp(`Active roles sync complete! Checked: **${result.checked}**, Added: **${result.added}**, Removed: **${result.removed}**.`);
		}
	}
} satisfies Command<ChatInputCommandInteraction>;