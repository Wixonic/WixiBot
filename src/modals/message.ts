import { MessageFlags } from "discord.js";

import type { Modal } from "../lib/client.ts";

export const modal = {
	customId: "message",
	async execute(_logger, interaction, ...options) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		switch (options[0]) {
			default: {
				throw new Error("Unknown modal type");
			}
		}
	}
} satisfies Modal;