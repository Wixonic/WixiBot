import { Events, type VoiceState } from "discord.js";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

const voiceJoinCache = new Map<string, number>();

export const event = {
	type: Events.VoiceStateUpdate,
	once: false,

	async execute(logger: Logger, oldState: VoiceState, newState: VoiceState) {
		const member = newState.member || oldState.member;
		if (!member || member.user.bot) return;

		const guildId = newState.guild.id;
		const userId = member.id;
		const cacheKey = `${guildId}-${userId}`;

		// User joined a voice channel
		if (!oldState.channelId && newState.channelId) voiceJoinCache.set(cacheKey, Date.now());
		else if (oldState.channelId && !newState.channelId) { // User left a voice channel
			const joinTime = voiceJoinCache.get(cacheKey);
			if (joinTime) {
				const duration = Date.now() - joinTime;
				voiceJoinCache.delete(cacheKey);

				const user = await client.getUser(userId);
				if (user && user.settings.activity.record) user.addActivity(guildId, "message", oldState.channelId, duration);
			}
		} else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) { // User moved channels
			const joinTime = voiceJoinCache.get(cacheKey);
			if (joinTime) {
				const duration = Date.now() - joinTime;

				const user = await client.getUser(userId);
				if (user && user.settings.activity.record) user.addActivity(guildId, "voice" as any, oldState.channelId, duration);
			}

			voiceJoinCache.set(cacheKey, Date.now());
		}
	}
};
