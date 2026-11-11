import { Events, MessageFlags, type Interaction, type RepliableInteraction } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { parseCustomId } from "../lib/utils.ts";

const respondError = async (interaction: RepliableInteraction, logger: Logger, message: string): Promise<void> => {
	try {
		let fetchedReply;
		try {
			if (interaction.replied || interaction.deferred) fetchedReply = await interaction.fetchReply();
		} catch (error) {
			logger.debug("Failed to fetch reply", {
				cause: error
			});
		}

		if (fetchedReply) await fetchedReply.edit(message);
		else if (interaction.replied || interaction.deferred) await interaction.followUp({
			content: message,
			flags: MessageFlags.Ephemeral
		});
		else await interaction.reply({
			content: message,
			flags: MessageFlags.Ephemeral
		});
	} catch (error) {
		logger.error("Failed to send error response", {
			cause: error
		});
	}
};

const respondUnavailable = async (interaction: RepliableInteraction, logger: Logger, message: string): Promise<void> => {
	try {
		if (interaction.replied || interaction.deferred) await interaction.editReply(message);
		else await interaction.reply({
			content: message,
			flags: MessageFlags.Ephemeral
		});
	} catch (error) {
		logger.debug("Failed to respond to unavailable interaction", {
			cause: error
		});
	}
};

export const event = {
	type: Events.InteractionCreate,
	once: false,

	async execute(logger: Logger, interaction: Interaction) {
		const interactionLogger = logger.clone(() => `[I-${interaction.id}]`);

		client.getUser(interaction.user.id).catch(() => { });

		interactionLogger.debug(`Received interaction by ${interaction.user.username} (${interaction.user.id})`);

		if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
			interactionLogger.debug(`Executing command ${interaction.commandName} (${interaction.commandId})`);

			const commandObject = client.getCommand(interaction.commandName);
			if (!commandObject) {
				interactionLogger.warn(`Unknown command ${interaction.commandName}`);
				await respondUnavailable(interaction, interactionLogger, "This command is not available.");
				return;
			}

			try {
				await commandObject.execute(interactionLogger, interaction);
			} catch (error) {
				interactionLogger.error(`Error executing ${interaction.commandName}`, {
					cause: error
				});
				await respondError(interaction, interactionLogger, "There was an error while executing this command!");
			}
		} else if (interaction.isMessageComponent()) {
			interactionLogger.debug(`Executing component ${interaction.customId}`);

			const [customId, ...options] = parseCustomId(interaction.customId);
			const componentObject = client.getComponent(customId);
			if (!componentObject) {
				interactionLogger.warn(`Unknown component ${customId}`);
				await respondUnavailable(interaction, interactionLogger, "This component is no longer available.");
				return;
			}

			try {
				await componentObject.execute(interactionLogger, interaction, ...options);
			} catch (error) {
				interactionLogger.error(`Error handling component ${customId}`, {
					cause: error
				});
				await respondError(interaction, interactionLogger, "There was an error while interacting with this component!");
			}
		} else if (interaction.isModalSubmit()) {
			interactionLogger.debug(`Executing modal ${interaction.customId}`);

			const [customId, ...options] = parseCustomId(interaction.customId);
			const modalObject = client.getModal(customId);
			if (!modalObject) {
				interactionLogger.warn(`Unknown modal ${customId}`);
				await respondUnavailable(interaction, interactionLogger, "This modal is no longer available.");
				return;
			}

			try {
				await modalObject.execute(interactionLogger, interaction, ...options);
			} catch (error) {
				interactionLogger.error(`Error handling modal ${customId}`, {
					cause: error
				});
				await respondError(interaction, interactionLogger, "There was an error while submitting this modal!");
			}
		}
	}
};