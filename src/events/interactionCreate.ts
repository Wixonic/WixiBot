import { Events, MessageFlags, type Interaction } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { User } from "../lib/user.ts";
import { parseCustomId } from "../lib/utils.ts";

export const event = {
	type: Events.InteractionCreate,
	once: false,

	async execute(logger: Logger, interaction: Interaction) {
		const interactionLogger = logger.clone(() => `[I-${interaction.id}]`);

		if (!client.getUser(interaction.user.id)) {
			const user = new User(interactionLogger, interaction.user);
			await user.init();
		}

		interactionLogger.debug(`Received interaction by ${interaction.user.username} (${interaction.user.id})`);

		if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
			interactionLogger.debug(`Executing command ${interaction.commandName} (${interaction.commandId})`);

			const commandObject = client.getCommand(interaction.commandName);

			try {
				await commandObject?.execute(interactionLogger, interaction);
			} catch (error) {
				interactionLogger.error(`Error executing ${interaction.commandName}`, {
					cause: error
				});

				try {
					let fetchedReply;
					try {
						if (interaction.replied || interaction.deferred) fetchedReply = await interaction.fetchReply();
					} catch (error) {
						interactionLogger.debug("Failed to fetch reply", {
							cause: error
						})
					}

					if (fetchedReply) await fetchedReply.edit("There was an error while executing this command!");
					else if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while executing this command!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while executing this command!",
						flags: MessageFlags.Ephemeral
					});
				} catch (error) {
					interactionLogger.error("Failed to send error response", {
						cause: error
					});
				}
			}
		} else if (interaction.isMessageComponent()) {
			interactionLogger.debug(`Executing component ${interaction.customId}`);

			const [customId, ...options] = parseCustomId(interaction.customId);
			const componentObject = client.getComponent(customId);

			try {
				await componentObject?.execute(interactionLogger, interaction, ...options);
			} catch (error) {
				interactionLogger.error(`Error handling component ${customId}`, {
					cause: error
				});

				try {
					let fetchedReply;
					try {
						if (interaction.replied || interaction.deferred) fetchedReply = await interaction.fetchReply();
					} catch (error) {
						interactionLogger.debug("Failed to fetch reply", {
							cause: error
						})
					}

					if (fetchedReply) await fetchedReply.edit("There was an error while interacting with this component!");
					else if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while interacting with this component!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while interacting with this component!",
						flags: MessageFlags.Ephemeral
					});
				} catch (error) {
					interactionLogger.error("Failed to send error response", {
						cause: error
					});
				}
			}
		} else if (interaction.isModalSubmit()) {
			interactionLogger.debug(`Executing modal ${interaction.customId}`);

			const [customId, ...options] = parseCustomId(interaction.customId);
			const modalObject = client.getModal(customId);

			try {
				await modalObject?.execute(interactionLogger, interaction, ...options);
			} catch (error) {
				interactionLogger.error(`Error handling modal ${customId}`, {
					cause: error
				});

				try {
					let fetchedReply;
					try {
						if (interaction.replied || interaction.deferred) fetchedReply = await interaction.fetchReply();
					} catch (error) {
						interactionLogger.debug("Failed to fetch reply", {
							cause: error
						})
					}

					if (fetchedReply) await fetchedReply.edit("There was an error while submitting this modal!");
					else if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while submitting this modal!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while submitting this modal!",
						flags: MessageFlags.Ephemeral
					});
				} catch (error) {
					interactionLogger.error("Failed to send error response", {
						cause: error
					});
				}
			}
		}
	}
};