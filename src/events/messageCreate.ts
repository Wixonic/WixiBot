import { Events, type Message } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.MessageCreate,
	once: false,

	async execute(_logger: Logger, message: Message) {
		if (message.author.bot || !message.guildId) return;

		const user = await client.getUser(message.author.id);
		if (user && user.settings.activity.record) {
			user.addActivity(message.guildId, "message");

			for (const mentionedDiscordUser of message.mentions.users.values()) {
				if (!mentionedDiscordUser.bot && mentionedDiscordUser.id !== message.author.id) {
					const mentionedUser = await client.getUser(mentionedDiscordUser.id);
					if (mentionedUser && mentionedUser.settings.activity.record) mentionedUser.addActivity(message.guildId, "mention");
				}
			}
		}
	}
};