import type { GuildMember } from "discord.js";

import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import type { User } from "../lib/user.ts";

export const job: Job = {
	cron: "* * * * *", // Every minute
	name: "Check Presence",
	async execute(logger: Logger) {
		if (client.discord) {
			logger.debug("Running presence check...");
			let checked = 0;

			for (const guild of client.discord.guilds.cache.values()) {
				let members;
				try {
					members = await guild.members.fetch();
				} catch (error) {
					logger.error(`Failed to fetch members for guild ${guild.id}`, {
						cause: error
					});
					continue;
				}

				const userPackages = await Promise.all(members.map(async (member): Promise<{
					member: GuildMember;
					user: User | null;
				}> => {
					const user = await client.getUser(member.id);
					return { member, user };
				}));

				for (const { member, user } of userPackages) {
					if (user && user.settings.activity.record != false) {
						checked++;
						user.recordActivity(guild.id, member.presence);
					}
				}
			}

			logger.info(`Presence check complete: ${checked} checked.`);
		} else logger.warn("Skipped presence check: Discord client unavailable.");
	}
};