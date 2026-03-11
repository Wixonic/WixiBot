import { type ClientSettings, type ClientName, getSettings, loadSettings } from "./lib/settings.ts";
import { logger as mainLogger } from "./lib/logger.ts";
import { wait } from "./lib/utils.ts";

const main = async () => {
	let client: ClientName | undefined = undefined;
	let settings: ClientSettings;
	try {
		client = Deno.env.get("CLIENT") as ClientName | undefined;
		await loadSettings(client);
		settings = getSettings();
	} catch (e) {
		return mainLogger.error(`Failed to load settings`, {
			cause: e
		});
	}

	mainLogger.info(`Starting as ${client} - ID: ${settings.clientId}`);

	let retries = 0;
	const logger = mainLogger.clone(() => `[${String(retries).padStart(2, "0")}/10] -`);

	while (true) {
		try {
			logger.debug("Running...");
			break;
		} catch (e) {
			retries++;

			logger.error(`Failed to start ${client}`, {
				cause: e
			});

			const delay = retries >= 10 ? 60 : retries;
			logger.warn(`Waiting ${delay}s before next attempt...`);
			await wait(delay * 1000);
		}
	}
};

main();