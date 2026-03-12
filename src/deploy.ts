import { REST, Routes } from "discord.js";

import { logger as mainLogger } from "./lib/logger.ts";
import { type ClientType, loadSettings, getSettings } from "./lib/settings.ts";

const deploy = async () => {
	const logger = mainLogger.clone("[Deploy]");

	let clientType: ClientType;
	try {
		clientType = (Deno.env.get("CLIENT") as ClientType) ?? "default";
		await loadSettings(clientType);
	} catch (e) {
		return logger.error("Failed to load settings", { cause: e });
	}

	const settings = getSettings();
	const rest = new REST().setToken(settings.token);

	const commands = [];

	logger.debug("Scanning commands...");

	try {
		for await (const dirEntry of Deno.readDir("./src/commands")) {
			if (dirEntry.isFile && (dirEntry.name.endsWith(".ts") || dirEntry.name.endsWith(".js"))) {
				const moduleUrl = new URL(`./commands/${dirEntry.name}`, import.meta.url).href;
				const module = await import(moduleUrl);

				if ("command" in module) {
					commands.push(module.command.data.toJSON());
					logger.debug(`Found command: ${module.command.data.name}`);
				}
			}
		}
	} catch (e) {
		return logger.error("Failed to scan commands", { cause: e });
	}

	logger.info(`Deploying ${commands.length} command${commands.length === 1 ? "" : "s"} as ${clientType}...`);

	try {
		await rest.put(Routes.applicationCommands(settings.clientId), {
			body: commands
		});

		logger.info(`Successfully deployed ${commands.length} command${commands.length === 1 ? "" : "s"}.`);
	} catch (e) {
		logger.error("Failed to deploy commands", { cause: e });
	}
};

deploy();