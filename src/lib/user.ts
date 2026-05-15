import type { Activity, PresenceStatus, Presence, User as DiscordUser, Guild } from "discord.js";
import path from "node:path";

import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";

export type Achievement = {
	id: string;
	name: string;
	description: string;
};

export interface UserActivity {
	activity: {
		activities?: Activity[];
		status?: PresenceStatus;
	} | null;
	changed: boolean;
	date: Date;

	guilds: Record<string, {
		achievements: Achievement[];

		messages: {
			sent: number;
			mentions: number;
			reactions: {
				added: number;
				received: number;
			};
		};

		voice: Record<string, {
			time: number;
			joins: number;
		}>;
	}>;
};

export interface UserSettings {
	activity: {
		record?: boolean;
		replay?: boolean;
	};
};

export const userSettingsSchema: DynamicSettingsSchema = {
	description: "User-specific settings.",
	type: "object",
	children: {
		activity: {
			key: "activity",
			name: "Activity Settings",
			description: "Settings related to live activity.",
			type: "object",
			children: {
				record: {
					key: "record",
					name: "Record Activity",
					description: "Whether to record your activity (in compliance with the privacy policy).",
					type: "boolean",
					default: true
				},
				replay: {
					key: "replay",
					name: "Replay",
					description: "Whether to send you a replay of your activity every month.",
					type: "boolean",
					default: true
				}
			}
		}
	}
};

export class User {
	#currentActivity: UserActivity = {
		activity: null,
		changed: false,
		date: new Date(),
		guilds: {}
	};
	#discordUser: DiscordUser;
	#logger: Logger;
	#storagePath: string;
	#settings: UserSettings = {
		activity: {}
	};

	#lastAccessed: number = Date.now();

	constructor(logger: Logger, discordUser: DiscordUser) {
		this.#discordUser = discordUser;
		this.#logger = logger.clone(`[U-${discordUser.id}]`);
		this.#storagePath = `./storage/users/${discordUser.id}/`;
	};

	get id() { this.touch(); return this.#discordUser.id; };
	get path() { this.touch(); return this.#storagePath; };
	get username() { this.touch(); return this.#discordUser.username; };
	get settings() { this.touch(); return this.#settings; };
	get lastAccessed() { this.touch(); return this.#lastAccessed; };

	touch() { this.#lastAccessed = Date.now(); };

	async init() {
		this.#logger.debug("Initializing user...");
		client.addUser(this);

		try {
			try {
				const content = await Deno.readTextFile(path.join(this.#storagePath, "settings.json"));
				this.#settings = JSON.parse(content);
				this.#logger.debug("Loaded existing user settings.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.#logger.debug("Created new user settings.");
				} else throw error;
			}
		} catch (error) {
			this.#logger.error("Failed to initialize user storage", {
				cause: error
			});
		}

		this.touch();
	};

	setPresence(presence: Partial<Presence> | null) {
		if (this.settings.activity.record) {
			this.#currentActivity.activity = {
				activities: presence?.activities,
				status: presence?.status
			};
			this.#currentActivity.changed = true;

			this.touch();
		}
	};

	async recordActivity() {
		if (!this.#currentActivity.changed && this.settings.activity.record) {
			this.#logger.debug("Changes detected, recording activity...");
			await Deno.mkdir(path.join(this.#storagePath, "activity"), {
				recursive: true
			});
			await Deno.writeTextFile(path.join(this.#storagePath, "activity", `${Date.now()}.json`), JSON.stringify({
				...this.#currentActivity,
				date: this.#currentActivity.date.getTime()
			}));

			this.#currentActivity = {
				activity: null,
				changed: false,
				date: new Date(),
				guilds: {}
			};

			this.touch();
		}
	};

	async sendReplay() {
		// Placeholder for replay logic
		this.touch();
	};

	async saveSettings() {
		await Deno.mkdir(this.#storagePath, {
			recursive: true
		});
		await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings));

		this.touch();
	};

	async delete(): Promise<void> {
		await Deno.remove(this.#storagePath, {
			recursive: true
		});
		this.#settings = {
			activity: {}
		};

		this.touch();
	};

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		this.touch();
	};
};