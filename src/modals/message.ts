import { MessageFlags } from "discord.js";

import type { Modal } from "../lib/client.ts";

export const modal = {
	customId: "message",
	async execute(_logger, interaction, ...options) {
		switch (options[0]) {
			case "as": {
				const ephemeralCheckbox = interaction.fields.getCheckbox("ephemeral");
				const isEphemeral = ephemeralCheckbox || false;

				await interaction.deferReply({
					flags: isEphemeral ? MessageFlags.Ephemeral : undefined
				});

				const content = interaction.fields.getTextInputValue("content");

				/* switch (interaction.fields.getRadioGroup("style")) {
					default: */
				await interaction.editReply({
					content: content
				});
				// }
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