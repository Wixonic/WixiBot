const { ApplicationCommandType, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const fs = require("fs");

const { sendLongMessage } = require("../lib/utils.js");

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
	run: async (logger, bot, server, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const helpMessage = fs.existsSync(bot.settings.paths.markdown.help) ? fs.readFileSync(bot.settings.paths.markdown.help, "utf-8") : null;

		if (helpMessage) {
			const guild = await bot.guilds.fetch(bot.settings.application.guildId);
			const guildCommands = guild?.commands ? await guild.commands.fetch() : new Collection();
			const globalCommands = await bot.application.commands.fetch();

			/**
			 * @param {import("discord.js").ApplicationCommand} command
			 * @returns {string}
			 */
			const displayCommand = (command) => {
				let entry = [];

				if (command.options && command.options.length > 0) {
					for (const option of command.options) {
						if (option.type === ApplicationCommandOptionType.Subcommand) {
							entry.push(`  - </${command.name} ${option.name}:${command.id}>: ${option.description}`);
						} else if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
							entry.push(`  - \`/${command.name} ${option.name}\``);

							for (const subOption of option.options) {
								if (subOption.type === ApplicationCommandOptionType.Subcommand) entry.push(`    - </${command.name} ${option.name} ${subOption.name}:${command.id}>: ${subOption.description}`);
							}
						}
					}
				}

				if (entry.length > 0) entry.unshift(`- \`/${command.name}\``);
				else entry.unshift(`- </${command.name}:${command.id}>: ${command.description}`);

				return entry.join("\n");
			};

			const globalSlashCommandList = [];
			for (const command of globalCommands.values()) {
				let valid = command.type === ApplicationCommandType.ChatInput;
				if (command.contexts && interaction.context) valid &&= command.contexts.includes(interaction.context);
				if (interaction.inGuild() && command.defaultMemberPermissions) valid &&= interaction.memberPermissions.has(command.defaultMemberPermissions);

				if (valid) globalSlashCommandList.push(displayCommand(command));
			}

			const guildSlashCommandList = [];
			for (const command of guildCommands.values()) {
				let valid = command.type === ApplicationCommandType.ChatInput;
				if (command.contexts && interaction.context) valid &&= command.contexts.includes(interaction.context);
				if (interaction.inGuild() && command.defaultMemberPermissions) valid &&= interaction.memberPermissions.has(command.defaultMemberPermissions);

				if (valid) guildSlashCommandList.push(displayCommand(command));
			}

			await sendLongMessage((options) => interaction.followUp(options), {
				content: helpMessage
					.replace("{{GLOBALSLASHCOMMANDS}}", globalSlashCommandList.length > 0 ? globalSlashCommandList.join("\n") : "There's currently no global commands.")
					.replace("{{GUILDSLASHCOMMANDS}}", guildSlashCommandList.length > 0 ? guildSlashCommandList.join("\n") : `There's currently no guild commands for ${guild.name}.`)
					.replaceAll("{{BOTID}}", bot.user.id)
					.replaceAll("{{GUILDNAME}}", guild.name)
					.replaceAll("{{DEFAULTTEXTCHANNEL}}", bot.settings.application.defaultTextChannel)
					.replaceAll("{{ROLESCHANNEL}}", bot.settings.application.commands.roles.channel)
					.replaceAll("{{TICKETSCHANNEL}}", bot.settings.application.commands.tickets.channel),
				flags: MessageFlags.Ephemeral
			});
		} else logger.error("Help file missing");
	}
};

module.exports = info;