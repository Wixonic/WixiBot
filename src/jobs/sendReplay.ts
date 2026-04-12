import type { GuildMember } from "discord.js";

import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import type { User } from "../lib/user.ts";

export const job: Job = {
	cron: "* * * * *", // Every minute
	name: "Send Replay",
	async execute(logger: Logger) {
		if (client.discord) {
			logger.debug("Running replay...");
			let sent = 0;

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

				const users = await Promise.all(members.map(async (member) => await client.getUser(member.id)));

				for (const user of users) {
					if (user && user.settings.activity.replay != false) {
						sent++;
						user.sendReplay();
					}
				}
			}

			logger.info(`Replay complete: ${sent} sent.`);
		} else logger.warn("Skipped replay: Discord client unavailable.");
	}
};