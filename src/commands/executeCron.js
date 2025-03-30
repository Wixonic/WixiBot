const { ApplicationCommandType, InteractionContextType, MessageFlags, PermissionFlagsBits, ApplicationCommandOptionType } = require("discord.js");

const { log } = require("@wixonic/logger");

const CronHandler = require("../lib/crons.js");
const handler = new CronHandler(log);
handler.loadCrons();

const choices = [];
for (const job of handler.crons) choices.push({
	name: job.name,
	value: job.name
});

/**
 * @type {import("../types").CommandInfo}
 */
const info = {
	name: "Execute Cron",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "execute-cron",
		description: "Execute a cron job without waiting for it",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "name",
				description: "Name of the cron job",
				choices,
				required: true
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const jobName = interaction.options.getString("name");
		const job = bot.cronHandler.crons.find((job) => job.name == jobName);

		if (job) {
			await job.run(logger, bot, 0, new Date());
			await interaction.followUp(`Cron job "${job.name}" executed`);
		} else logger.error(`Job "${jobName}" doesn't exist`);
	}
};

module.exports = info;