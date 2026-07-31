import { type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const job: Job = {
	cron: "0 0 1 * *",
	name: "Monthly AI Replay",
	enabled: false,
	async execute(logger: Logger) {
		logger.debug("Monthly AI Replay is currently disabled.");
	}
};
