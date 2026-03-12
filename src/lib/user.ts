import type { User as DiscordUser } from "discord.js";

import { client } from "./client.ts";
import type { Logger } from "./logger.ts";

export type UserSettings = Record<string, unknown>;

export class User {
	#discordUser: DiscordUser;
	#storagePath: string;
	#settings: UserSettings = {};
	#logger: Logger;

	constructor(logger: Logger, discordUser: DiscordUser) {
		this.#discordUser = discordUser;
		this.#logger = logger.clone(`[User: ${discordUser.username}]`);
		this.#storagePath = `./storage/users/${discordUser.id}/settings.json`;
	};

	get id() { return this.#discordUser.id; };
	get username() { return this.#discordUser.username; };
	get settings() { return this.#settings; };

	async init() {
		this.#logger.debug("Initializing user...");
		client.addUser(this);

		try {
			await Deno.mkdir(this.#storagePath.split("/").slice(0, -1).join("/"), { recursive: true });
			try {
				const content = await Deno.readTextFile(this.#storagePath);
				this.#settings = JSON.parse(content);
				this.#logger.debug("Loaded existing user settings.");
			} catch (e) {
				if (e instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.#logger.debug("Created new user settings.");
				} else throw e;
			}
		} catch (e) {
			this.#logger.error("Failed to initialize user storage", { cause: e });
		}
	};

	async saveSettings() {
		await Deno.writeTextFile(this.#storagePath, JSON.stringify(this.#settings, null, "\t"));
	};

	reportError(message: string, error: unknown) {
		this.#logger.error(message, { cause: error });

		this.#discordUser.send(`An error occurred while processing your request:
\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``).catch(() => { });
	};
};