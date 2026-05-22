import { Events, type AnyThreadChannel, ChannelType } from "discord.js";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.ThreadCreate,
	once: false,

	async execute(_logger: Logger, thread: AnyThreadChannel, newlyCreated: boolean) {
		if (!newlyCreated) return;

		if (!thread.ownerId) {
			try {
				await thread.fetch();
			} catch (_error) {
				return; // Cannot fetch thread.
			}
		}

		if (!thread.ownerId) return;

		const parent = thread.parent;
		if (parent && parent.type === ChannelType.GuildForum) {
			const user = await client.getUser(thread.ownerId);
			if (user && user.settings.activity.record) user.addActivity(thread.guildId, "forumPost");
		}
	}
};