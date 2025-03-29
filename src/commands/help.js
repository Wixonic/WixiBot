const { ApplicationCommandType, MessageFlags } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Help",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "help",
		description: "Need help?"
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const helpMessage = fs.existsSync(bot.settings.paths.markdown.help) ? fs.readFileSync(bot.settings.paths.markdown.help, "utf-8") : null;

		if (helpMessage) {
			const guild = await bot.guilds.fetch(bot.settings.application.guildId);
			const guildCommands = guild?.commands ? await guild.commands.fetch() : new Collection();
			const globalCommands = await bot.application.commands.fetch();

			const globalSlashCommandList = [];
			for (const command of globalCommands.values()) {
				let valid = command.type == ApplicationCommandType.ChatInput;
				if (command.contexts && interaction.context) valid &&= command.contexts.includes(interaction.context);
				if (interaction.inGuild() && command.defaultMemberPermissions) valid &&= interaction.memberPermissions.has(command.defaultMemberPermissions);
				if (valid) globalSlashCommandList.push(`- </${command.name}:${command.id}>: ${command.description}`);
			}

			const guildSlashCommandList = [];
			for (const command of guildCommands.values()) {
				let valid = command.type == ApplicationCommandType.ChatInput;
				if (command.contexts && interaction.context) valid &&= command.contexts.includes(interaction.context);
				if (interaction.inGuild() && command.defaultMemberPermissions) valid &&= interaction.memberPermissions.has(command.defaultMemberPermissions);
				if (valid) guildSlashCommandList.push(`- </${command.name}:${command.id}>: ${command.description}`);
			}

			await interaction.followUp(helpMessage
				.replace("{{GLOBALSLASHCOMMANDS}}", globalSlashCommandList.length > 0 ? globalSlashCommandList.join("\n") : "There's currently no global commands.")
				.replace("{{GUILDSLASHCOMMANDS}}", guildSlashCommandList.length > 0 ? guildSlashCommandList.join("\n") : `There's currently no guild commands for ${guild.name}.`)
				.replaceAll("{{BOTID}}", bot.user.id)
				.replaceAll("{{GUILDNAME}}", guild.name)
				.replaceAll("{{DEFAULTTEXTCHANNEL}}", bot.settings.application.defaultTextChannel)
				.replaceAll("{{ROLESCHANNEL}}", bot.settings.application.commands.roles.channel)
				.replaceAll("{{TICKETSCHANNEL}}", bot.settings.application.commands.tickets.channel)
			);
		} else logger.error("Help file missing");
	}
};

module.exports = info;