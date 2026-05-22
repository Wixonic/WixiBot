import { Events, type MessageReaction, type User as DiscordUser } from "discord.js";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.MessageReactionAdd,
	once: false,

	async execute(logger: Logger, reaction: MessageReaction, discordUser: DiscordUser) {
		if (discordUser.bot) return;

		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error("Failed to fetch partial reaction", { cause: error });
				return;
			}
		}

		if (!reaction.message.guildId) return;

		const user = await client.getUser(discordUser.id);
		if (user && user.settings.activity.record) user.addActivity(reaction.message.guildId, "reactionAdd");

		const author = reaction.message.author;
		if (author && !author.bot && author.id !== discordUser.id) {
			const authorUser = await client.getUser(author.id);
			if (authorUser && authorUser.settings.activity.record) authorUser.addActivity(reaction.message.guildId, "reactionReceive");
		}
	}
};
