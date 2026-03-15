import { client } from "./lib/client.ts";
import { colors, logger as mainLogger } from "./lib/logger.ts";
import { type ClientSettings, type ClientType, getSettings, loadSettings } from "./lib/settings.ts";
import { StopSignal, wait } from "./lib/utils.ts";

const main = async () => {
	let clientType: ClientType;
	let settings: ClientSettings;
	try {
		clientType = (Deno.env.get("CLIENT") as ClientType) ?? "default";
		await loadSettings(clientType);
		settings = getSettings();
	} catch (e) {
		return mainLogger.error(`Failed to load settings`, {
			cause: e
		});
	}

	let retries = 0;
	const logger = mainLogger.clone(() => `[${String(retries).padStart(2, "0")}/10] -`);

	let isStopping = false;

	const stopHandler = () => {
		if (isStopping) return;
		isStopping = true;

		logger.jump();
		logger.info(`Bot stopped gracefully.${colors.debug}`, {
			cause: new StopSignal()
		});

		client.destroy().then(() => Deno.exit(0));
	};

	Deno.addSignalListener("SIGINT", stopHandler);
	Deno.addSignalListener("SIGTERM", stopHandler);

	while (!isStopping) {
		retries++;
		logger.debug(`Starting as ${clientType} - ID: ${settings.clientId}`);

		try {
			try {
				await client.init(logger, settings);
				logger.info(`Client connected as ${client.user?.username}.`);

				await new Promise((_, reject) => {
					globalThis.addEventListener("error", (e: ErrorEvent) => {
						e.preventDefault();
						reject(e.error);
					}, { once: true });

					globalThis.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
						e.preventDefault();
						reject(e.reason);
					}, { once: true });

					client.on("error", reject);
				});
			} catch (e) {
				logger.error("Failed to start client", {
					cause: e
				});
			}
		} catch (e) {
			logger.error("Failure", {
				cause: e
			});
		} finally {
			await client.destroy();
		}

		const delay = retries >= 10 ? 60 : retries;
		logger.warn(`Waiting ${delay}s before next attempt...`);
		await wait(delay * 1000);
	}
};

main();