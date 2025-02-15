const CommandHandler = require("../commands");

/**
 * @type {ListenerInfo}
 */
const listener = {
	name: "Interaction Create",
	event: "interactionCreate",

	/**
	 * @param {import("discord.js").Interaction} interaction
	 */
	run: async (bot, logger, interaction) => {
		if (interaction.isCommand()) {
			for (const command of CommandHandler.commands) {
				const commandLogger = logger.basicIndent(`[${command.name}]`);

				if (command.deploy.type == interaction.commandType && command.deploy.name == interaction.commandName) {
					try {
						commandLogger.debug("Runnning...");
						await command.run(bot, commandLogger, interaction);
					} catch (e) {
						commandLogger.error(e);
					}

					return;
				}
			}

			logger.error("Invalid command:", interaction.commandName);
		}

		logger.warn("Invalid interaction");
	}
};

module.exports = listener;