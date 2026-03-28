import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const job: Job = {
	cron: "*/5 * * * *",
	name: "Clear Cache",
	execute(_logger: Logger) {
		client.sweep();
	}
};