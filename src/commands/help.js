const { ApplicationCommandType, InteractionContextType, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * @type {CommandInfo}
 */
const info = {
	name: "Help",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "help",
		description: "Need help?",
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const helpPath = path.join(__dirname, "..", "settings", bot.application.id, "help.md");
		const helpMessage = fs.existsSync(helpPath) ? fs.readFileSync(helpPath, "utf-8") : null;

		if (helpMessage) {
			const commands = await bot.application.commands.fetch();

			if (commands.size > 0) {
				const slashCommandList = [];
				for (const command of commands.filter((command) => command.type == ApplicationCommandType.ChatInput).values()) slashCommandList.push(`- </${command.name}:${command.id}>: ${command.description}`);

				await interaction.editReply(helpMessage.replace("{{SLASHCOMMANDS}}", slashCommandList.join("\n")));
			} else logger.error("Failed to fetch commands.");
		} else logger.error("Help file missing.");
	}
};

module.exports = info;