import { Events, type Message } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.MessageCreate,
	once: false,

	async execute(logger: Logger, message: Message) {
		if (!message.guildId) return;

		const guild = await client.getGuild(message.guildId);
		if (guild) await guild.handleStickyMessage(message);

		if (message.author.bot) return;

		const user = await client.getUser(message.author.id);
		if (user && user.settings.activity.record) {
			user.addActivity(message.guildId, "message").catch((error) => logger.error("Failed to add message activity", { cause: error }));

			for (const mentionedDiscordUser of message.mentions.users.values()) {
				if (!mentionedDiscordUser.bot && mentionedDiscordUser.id !== message.author.id) {
					const mentionedUser = await client.getUser(mentionedDiscordUser.id);
					if (mentionedUser && mentionedUser.settings.activity.record) mentionedUser.addActivity(message.guildId, "mention").catch((error) => logger.error("Failed to add mention activity", { cause: error }));
				}
			}
		}
	}
};