import { Events, type Guild as DiscordGuild } from "discord.js";

import { Guild } from "../lib/guild.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const event = {
	type: Events.GuildCreate,
	once: false,

	async execute(logger: Logger, discordGuild: DiscordGuild) {
		const settings = getSettings();
		if (discordGuild.id !== settings.discord.primaryGuildId) {
			logger.warn(`Unauthorized guild installation detected on ${discordGuild.name} (${discordGuild.id}). Leaving immediately...`);
			await discordGuild.leave().catch((error) => logger.error(`Failed to leave unauthorized guild ${discordGuild.id}`, { cause: error }));
			return;
		}

		logger.info(`Guild app installed on ${discordGuild.name} (${discordGuild.id})`);

		const guild = new Guild(logger, discordGuild);
		await guild.init();
	}
};