import type { User as DiscordUser } from "discord.js";
import path from "node:path";

import { client } from "./client.ts";
import type { Logger } from "./logger.ts";
import { sendChunks } from "./utils.ts";

export type UserSettings = Record<string, unknown>;

export class User {
	#discordUser: DiscordUser;
	#storagePath: string;
	#settings: UserSettings = {};
	#logger: Logger;

	constructor(logger: Logger, discordUser: DiscordUser) {
		this.#discordUser = discordUser;
		this.#logger = logger.clone(`[U-${discordUser.id}]`);
		this.#storagePath = `./storage/users/${discordUser.id}/`;
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
				const content = await Deno.readTextFile(path.join(this.#storagePath, "settings.json"));
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
		await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings, null, "\t"));
	};

	reportError(message: string, error: unknown) {
		this.#logger.error(message, { cause: error });

		sendChunks(`An error occurred while processing your request:
\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``, this.#discordUser.send.bind(this.#discordUser)).catch(() => { });
	};
};