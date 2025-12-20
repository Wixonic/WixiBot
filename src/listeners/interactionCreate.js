const { InteractionType } = require("discord.js");

const CommandHandler = require("../lib/commands.js");
const ComponentHandler = require("../lib/components.js");
const ModalHandler = require("../lib/modals.js");

/**
 * @type {import("../types.d.ts").ListenerInfo}
 */
const listener = {
	name: "Interaction Create",
	event: "interactionCreate",

	/**
	 * @param {import("discord.js").Interaction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		if (interaction.isCommand()) {
			for (const command of CommandHandler.commands) {
				const commandLogger = {
					debug: (...any) => logger.debug(`[Command ${command.name}]`, ...any),
					error: (...any) => logger.error(`[Command ${command.name}]`, ...any),
					info: (...any) => logger.info(`[Command ${command.name}]`, ...any),
					warn: (...any) => logger.warn(`[Command ${command.name}]`, ...any)
				};

				if (command.deploy.type === interaction.commandType && command.deploy.name === interaction.commandName) {
					try {
						commandLogger.info(`Launched by "${(interaction.member ?? interaction.user).displayName}" (${interaction.user.id})`);
						await command.run(commandLogger, bot, server, interaction);
						return;
					} catch (e) {
						commandLogger.error(e);
					}
				}
			}

			logger.warn("Invalid command:", interaction.commandName);
		} else if (interaction.isButton()) {
			const id = interaction.customId.split("_")[0];
			const args = interaction.customId.split("_").slice(1);

			for (const component of ComponentHandler.buttons) {
				const componentLogger = {
					debug: (...any) => logger.debug(`[Button ${component.name}]`, ...any),
					error: (...any) => logger.error(`[Button ${component.name}]`, ...any),
					info: (...any) => logger.info(`[Button ${component.name}]`, ...any),
					warn: (...any) => logger.warn(`[Button ${component.name}]`, ...any)
				};

				if (component.id === id) {
					try {
						componentLogger.info(`Launched by "${(interaction.member ?? interaction.user).displayName}" (${interaction.user.id})` + (args.length > 0 ? ` with args: ${args.join(", ")}` : ""));
						await component.run(componentLogger, bot, interaction, ...args);
						return;
					} catch (e) {
						componentLogger.error(e);
					}
				}
			}

			logger.warn("Invalid button interaction:", interaction.customId);
		} else if (interaction.isModalSubmit()) {
			const id = interaction.customId;

			for (const modal of ModalHandler.modals) {
				const modalLogger = {
					debug: (...any) => logger.debug(`[Modal ${modal.name}]`, ...any),
					error: (...any) => logger.error(`[Modal ${modal.name}]`, ...any),
					info: (...any) => logger.info(`[Modal ${modal.name}]`, ...any),
					warn: (...any) => logger.warn(`[Modal ${modal.name}]`, ...any)
				};

				if (modal.id === id) {
					try {
						modalLogger.info(`Launched by "${(interaction.member ?? interaction.user).displayName}" (${interaction.user.id})`);
						await modal.run(modalLogger, bot, interaction);
						return;
					} catch (e) {
						modalLogger.error(e);
					}
				}
			}

			logger.warn("Invalid modal interaction:", interaction.customId);
		} else logger.warn("Invalid interaction:", Object.keys(InteractionType).find((key) => InteractionType[key] === interaction.type));
	}
};

module.exports = listener;