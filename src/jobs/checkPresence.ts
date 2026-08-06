import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const job: Job = {
	cron: "* * * * *", // Every minute
	name: "Check Presence",
	async execute(logger: Logger) {
		if (client.discord) {
			logger.debug("Running presence check...");
			let checked = 0;

			for (const user of client.users.values()) {
				if (user.settings.activity.record) {
					checked++;

					let presence = null;
					for (const guild of client.discord.guilds.cache.values()) {
						const member = guild.members.cache.get(user.id);
						if (member?.presence) {
							presence = member.presence;
							break;
						}
					}

					if (presence) user.setPresence(presence);
					await user.recordActivity();
				}
			}

			if (checked > 0) logger.info(`Presence check complete: ${checked} checked.`);
		} else logger.warn("Skipped presence check: Discord client unavailable.");
	}
};