import { Events, type Message } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { moderationCache } from "../lib/moderation/cache.ts";

export const event = {
	type: Events.MessageCreate,
	once: false,

	async execute(_logger: Logger, message: Message) {
		if (message.author.bot || !message.guildId) return;

		const guild = await client.getGuild(message.guildId);
		if (guild) {
			const channelId = message.channelId;
			const categoryId = message.channel.isTextBased() && "parentId" in message.channel ? message.channel.parentId : null;

			const ignoredChannels = guild.settings.moderation.ignoredChannels || [];
			const lowRiskChannels = guild.settings.moderation.lowRiskChannels || [];

			const isIgnored = ignoredChannels.includes(channelId) || (categoryId && ignoredChannels.includes(categoryId));
			const isLowRisk = lowRiskChannels.includes(channelId) || (categoryId && lowRiskChannels.includes(categoryId));

			if (!isIgnored) {
				moderationCache.addMessage(message.channelId, message.author.username, message.author.id, message.content);
			}
		}

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