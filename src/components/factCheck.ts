import type { MessageComponentInteraction } from "discord.js";

import { client, type Component } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const component = {
	customId: "factCheck",
	async execute(_logger: Logger, interaction: MessageComponentInteraction, action: string) {
		if (interaction.guildId) {
			const guild = await client.getGuild(interaction.guildId);
			if (guild?.settings.channels.logs) {
				const channel = await interaction.guild?.channels.fetch(guild.settings.channels.logs).catch(() => null);
				if (channel && channel.isTextBased()) await channel.send(`Fact-check feedback from <@${interaction.user.id}> and marked it as **${action}**\nMessage: ${interaction.message.url}`).catch(() => null);
			}
		}

		await interaction.update({
			content: `${interaction.message.content}\n\n-# Feedback: <@${interaction.user.id}> marked this as **${action}**, thank you for your feedback!`,
			components: []
		});
	}
} satisfies Component;