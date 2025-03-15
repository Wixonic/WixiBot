const { ApplicationCommandType, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

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
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const helpMessage = fs.existsSync(bot.settings.paths.markdown.help) ? fs.readFileSync(bot.settings.paths.markdown.help, "utf-8") : null;

		if (helpMessage) {
			const commands = await bot.application.commands.fetch();

			if (commands.size > 0) {
				const slashCommandList = [];
				for (const command of commands.values()) {
					let valid = command.type == ApplicationCommandType.ChatInput;
					if (command.contexts && interaction.context) valid &&= command.contexts.includes(interaction.context);
					if (interaction.inGuild() && command.defaultMemberPermissions) valid &&= interaction.memberPermissions.has(command.defaultMemberPermissions);
					if (valid) slashCommandList.push(`- </${command.name}:${command.id}>: ${command.description}`);
				}

				await interaction.followUp(helpMessage.replace("{{SLASHCOMMANDS}}", slashCommandList.join("\n")));
			} else logger.error("Failed to fetch commands");
		} else logger.error("Help file missing");
	}
};

module.exports = info;