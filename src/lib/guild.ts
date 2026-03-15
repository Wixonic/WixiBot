import type { Guild as DiscordGuild } from "discord.js";

import { client } from "./client.ts";
import type { Logger } from "./logger.ts";

export interface GuildSettings {
	channels: {
		logs?: string;
	};
};

export class Guild {
	#discordGuild: DiscordGuild;
	#storagePath: string;
	#settings: GuildSettings = {
		channels: {}
	};
	#logger: Logger;

	constructor(logger: Logger, discordGuild: DiscordGuild) {
		this.#discordGuild = discordGuild;
		this.#logger = logger.clone(`[Guild: ${discordGuild.name}]`);
		this.#storagePath = `./storage/guilds/${discordGuild.id}/settings.json`;
	};

	get id() { return this.#discordGuild.id; };
	get name() { return this.#discordGuild.name; };
	get settings() { return this.#settings; };

	async init() {
		this.#logger.debug("Initializing guild...");

		try {
			await Deno.mkdir(this.#storagePath.split("/").slice(0, -1).join("/"), { recursive: true });
			try {
				const content = await Deno.readTextFile(this.#storagePath);
				this.#settings = JSON.parse(content);
				this.#logger.debug("Loaded existing guild settings.");
			} catch (e) {
				if (e instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.#logger.debug("Created new guild settings.");

					try {
						const owner = await this.#discordGuild.fetchOwner();

						const helpCommandId = await client.getCommandId("help", this.id);
						const settingsCommandId = await client.getCommandId("settings", this.id);

						await owner.send(`Hi!
I was successfully installed and initialized for your server **${this.name}**.

Check the available commands by typing ${helpCommandId ? `</help:${helpCommandId}>` : "`/help`"}.

> **Tip**: You can configure an error logging channel and a moderation channel so that I can send you reports directly in your server instead of DMs.
> Use </settings:${settingsCommandId}> to set it up!`).catch(() => { });;
					} catch (e) {
						this.#logger.warn("Failed to notify guild owner. DMs might be closed.", { cause: e });
					}
				} else throw e;
			}
		} catch (e) {
			this.#logger.error("Failed to initialize guild storage", { cause: e });
		}

		client.addGuild(this);
	};

	async saveSettings() {
		await Deno.writeTextFile(this.#storagePath, JSON.stringify(this.#settings, null, "\t"));
	};

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		if (this.#settings.channels.logs) {
			const channel = this.#discordGuild.channels.cache.get(this.#settings.channels.logs);

			if (channel && channel.isTextBased()) channel.send(`An error occurred:
					\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``).catch(() => { });
		} else this.#discordGuild.fetchOwner().then(async (owner) => {
			const settingsCommandId = await client.getCommandId("settings", this.id);

			owner.send(`An error occurred in your server **${this.name}**:
\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\`

> **Tip**: You can configure an error logging channel so that I can send you reports directly in your server instead of DMs.
> Use </settings:${settingsCommandId}> to set it up!`).catch(() => { });
		}).catch(() => { });
	};
};