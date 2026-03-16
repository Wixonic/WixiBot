import { Events, MessageFlags, type Interaction } from "discord.js";

import { client } from "../lib/client.ts";
import { Guild } from "../lib/guild.ts";
import type { Logger } from "../lib/logger.ts";
import { User } from "../lib/user.ts";

export const event = {
	type: Events.InteractionCreate,
	once: false,

	async execute(logger: Logger, interaction: Interaction) {
		const interactionLogger = logger.clone(() => `[I-${interaction.id}]`);

		if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
			if (interaction.guildId && !client.getGuild(interaction.guildId)) {
				const discordGuild = interaction.guild ?? await client.discord?.guilds.fetch(interaction.guildId).catch(() => null);

				if (discordGuild) {
					const guild = new Guild(interactionLogger, discordGuild);
					await guild.init();
				}
			}

			if (!client.getUser(interaction.user.id)) {
				const user = new User(interactionLogger, interaction.user);
				await user.init();
			}

			const commandObject = client.getCommand(interaction.commandName);

			try {
				await commandObject?.execute(interactionLogger, client, interaction);
			} catch (e) {
				interactionLogger.error(`Error executing ${interaction.commandName}`, {
					cause: e
				});

				if (interaction.replied || interaction.deferred) await interaction.editReply("There was an error while executing this command!");
				else await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral
				});
			}

			return;
		}

		if (interaction.isMessageComponent()) {
			const componentObject = client.getComponent(interaction.customId);

			try {
				await componentObject?.execute(interactionLogger, client, interaction);
			} catch (e) {
				interactionLogger.error(`Error handling component ${interaction.customId}`, {
					cause: e
				});

				if (interaction.replied || interaction.deferred) await interaction.editReply("There was an error while interacting with this component!");
				else await interaction.reply({
					content: "There was an error while interacting with this component!",
					flags: MessageFlags.Ephemeral
				});
			}

			return;
		}

		if (interaction.isModalSubmit()) {
			const modalObject = client.getModal(interaction.customId);

			try {
				await modalObject?.execute(interactionLogger, client, interaction);
			} catch (e) {
				interactionLogger.error(`Error handling modal ${interaction.customId}`, {
					cause: e
				});

				if (interaction.replied || interaction.deferred) await interaction.editReply("There was an error while submitting this modal!");
				else await interaction.reply({
					content: "There was an error while submitting this modal!",
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
};