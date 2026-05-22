import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const job: Job = {
	cron: "0 0 1 * *",
	name: "Monthly AI Replay",
	async execute(logger: Logger) {
		if (client.discord) {
			logger.info("Running monthly AI replay generation...");

			const targetMonth = new Date();
			// targetMonth.setMonth(targetMonth.getMonth() - 1);

			let sentCount = 0;
			const usersPath = "./storage/users/";
			try {
				for await (const directoryEntry of Deno.readDir(usersPath)) {
					if (directoryEntry.isDirectory) {
						const userId = directoryEntry.name;
						const user = await client.getUser(userId);
						if (user && user.settings.activity.replay) {
							logger.debug(`Generating replay for ${user.username} (${user.id})`);

							const sent = await user.sendReplay(targetMonth);
							if (sent) sentCount++;
						}
					}
				}
			} catch (error) {
				logger.error("Failed to read users directory for monthly replay", { cause: error });
			}

			logger.info(`Monthly AI replay complete. Sent ${sentCount} replays.`);
		} else logger.warn("Skipped monthly replay: Discord client unavailable.");
	}
};
