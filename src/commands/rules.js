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
		description: "Publishes the server rules in the specified channel",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const rulesMessage = fs.existsSync(bot.settings.paths.markdown.rules) ? fs.readFileSync(bot.settings.paths.markdown.rules, "utf-8") : null;

		if (rulesMessage) {
			const guild = await bot.guilds.fetch(bot.settings.application.guildId);

			if (guild) {
				const channel = await guild.channels.fetch(bot.settings.application.commands.rules.channel);

				if (channel && channel.isTextBased() && channel.isSendable()) {
					await channel.send({
						allowedMentions: {},
						content: rulesMessage
							.replaceAll("{{BOTID}}", bot.user.id)
							.replaceAll("{{GUILDNAME}}", guild.name)
							.replaceAll("{{ADMINROLE}}", bot.settings.application.adminRole)
							.replaceAll("{{DEFAULTTEXTCHANNEL}}", bot.settings.application.defaultTextChannel)
							.replaceAll("{{ROLESCHANNEL}}", bot.settings.application.commands.roles.channel)
							.replaceAll("{{TICKETCHANNEL}}", bot.settings.application.commands.ticket.channel)
					});

					await interaction.followUp(`Rules published at <#${channel.id}>.`);
				} else logger.error("Invalid channel:", bot.settings.application.commands.rules.channel);
			} else logger.error("Invalid guild:", bot.settings.application.guildId);
		} else logger.error("Rules file missing");
	}
};

module.exports = info;