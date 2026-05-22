import { Events, ChannelType, type VoiceState } from "discord.js";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

const stageJoinCache = new Set<string>();

export const event = {
	type: Events.VoiceStateUpdate,
	once: false,

	async execute(_logger: Logger, oldState: VoiceState, newState: VoiceState) {
		const member = newState.member || oldState.member;
		if (!member || member.user.bot) return;

		const guildId = newState.guild.id;
		const userId = member.id;

		if (newState.channel?.type === ChannelType.GuildStageVoice && oldState.channelId !== newState.channelId) {
			const cacheKey = `${guildId}-${userId}-${newState.channelId}`;

			if (!stageJoinCache.has(cacheKey)) {
				stageJoinCache.add(cacheKey);

				const user = await client.getUser(userId);
				if (user && user.settings.activity.record) {
					user.addActivity(guildId, "stageEvent").catch(e => _logger.error("Failed to add stage activity", { cause: e }));
				}

				setTimeout(() => stageJoinCache.delete(cacheKey), 24 * 60 * 60 * 1000);
			}
		}
	}
};