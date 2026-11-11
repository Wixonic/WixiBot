import { MessageFlags, PermissionFlagsBits } from "discord.js";

import type { Modal } from "../lib/client.ts";

export const modal = {
	customId: "message",
	async execute(_logger, interaction, ...options) {
		switch (options[0]) {
			case "as": {
				if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral });
					await interaction.editReply({
						content: "You do not have permission to send messages as the bot."
					});
					return;
				}

				const isEphemeral = interaction.fields.getCheckbox("ephemeral");

				await interaction.deferReply({
					flags: isEphemeral ? MessageFlags.Ephemeral : undefined
				});

				const content = interaction.fields.getTextInputValue("content");

				await interaction.editReply({
					content: content
				});
				break;
			}

			default: {
				await interaction.deferReply({
					flags: MessageFlags.Ephemeral
				});
				throw new Error("Unknown modal type");
			}
		}
	}
} satisfies Modal;