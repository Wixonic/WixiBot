import { Events, type Guild as DiscordGuild } from "discord.js";

import { Guild } from "../lib/guild.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.GuildCreate,
	once: false,

	async execute(logger: Logger, discordGuild: DiscordGuild) {
		logger.info(`Guild app installed on ${discordGuild.name} (${discordGuild.id})`);

		const guild = new Guild(logger, discordGuild);
		await guild.init();
	}
};