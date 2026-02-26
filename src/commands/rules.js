const { ApplicationCommandType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Rules",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "rules",
		description: "Publishes the server rules",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const settings = bot.settings.application.commands.rules;

		const rulesMessage = fs.existsSync(bot.settings.paths.markdown.rules) ? fs.readFileSync(bot.settings.paths.markdown.rules, "utf-8") : null;

		if (rulesMessage) {
			const guild = await bot.guilds.fetch(bot.settings.application.guildId);

			const channel = await guild.channels.fetch(settings.channel);

			if (channel && channel.isSendable()) {
				const commands = await bot.application.commands.fetch();
				const helpCommandId = commands.find(c => c.name === "help")?.id || "HELP_ID";
				const messages = await channel.messages.fetch({
					limit: 10
				});

				for (const message of messages.values()) await channel.messages.delete(message);

				await channel.send({
					allowedMentions: {},
					content: rulesMessage
						.replaceAll("{{BOTID}}", bot.user.id)
						.replaceAll("{{GUILDNAME}}", guild.name)
						.replaceAll("{{ADMINROLE}}", bot.settings.application.adminRole)
						.replaceAll("{{DEFAULTTEXTCHANNEL}}", bot.settings.application.defaultTextChannel)
						.replaceAll("{{DEFAULTFRENCHTEXTCHANNEL}}", bot.settings.application.defaultFrenchTextChannel)
						.replaceAll("{{ROLESCHANNEL}}", bot.settings.application.commands.roles.channel)
						.replaceAll("{{TICKETSCHANNEL}}", bot.settings.application.commands.tickets.channel)
						.replaceAll("{{HELPCOMMAND}}", helpCommandId)
				});

				await interaction.followUp(`Rules published at <#${channel.id}>.`);
			} else logger.error("Invalid channel:", settings.channel);
		} else logger.error("Rules file missing");
	}
};

module.exports = info;