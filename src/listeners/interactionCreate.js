const { InteractionType } = require("discord.js");
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
				const commandLogger = {
					debug: (...any) => logger.debug(`[${command.name}]`, ...any),
					error: (...any) => logger.error(`[${command.name}]`, ...any),
					info: (...any) => logger.info(`[${command.name}]`, ...any),
					warn: (...any) => logger.warn(`[${command.name}]`, ...any)
				};

				if (command.deploy.type == interaction.commandType && command.deploy.name == interaction.commandName) {
					try {
						commandLogger.debug("Runnning...");
						await command.run(bot, commandLogger, interaction);
						return;
					} catch (e) {
						commandLogger.error(e);
					}
				}
			}

			logger.error("Invalid command:", interaction.commandName);
		}

		logger.warn("Invalid interaction:", Object.keys(InteractionType).find((key) => InteractionType[key] == interaction.type));
	}
};

module.exports = listener;