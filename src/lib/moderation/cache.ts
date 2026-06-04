import type { TextBasedChannel } from "discord.js";

export interface CacheEntry {
	author: string;
	authorId: string;
	content: string;
}

class ModerationCache {
	private cache = new Map<string, CacheEntry[]>();
	private fetchedChannels = new Set<string>();

	public addMessage(channelId: string, author: string, authorId: string, content: string) {
		if (!this.cache.has(channelId)) {
			this.cache.set(channelId, []);
		}

		const messages = this.cache.get(channelId)!;

		messages.push({
			author,
			authorId,
			content
		});

		if (messages.length > 10) this.cache.set(channelId, messages.slice(messages.length - 10));
	}

	public async getContext(channel: TextBasedChannel, excludeMessageId?: string): Promise<CacheEntry[]> {
		if (!this.fetchedChannels.has(channel.id)) {
			try {
				const fetched = await channel.messages.fetch({ limit: 11 });
				const formatted = fetched
					.filter((message) => message.id !== excludeMessageId)
					.map((message) => ({
						author: message.author.username,
						authorId: message.author.id,
						content: message.content
					}))
					.reverse()
					.slice(-10);

				this.cache.set(channel.id, formatted);
				this.fetchedChannels.add(channel.id);
			} catch (_error) {
				// 
			}
		}

		return this.cache.get(channel.id) || [];
	}

	public clear(channelId: string) {
		this.cache.delete(channelId);
	}
}

export const moderationCache = new ModerationCache();