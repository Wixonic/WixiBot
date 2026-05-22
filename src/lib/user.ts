import type { Activity, PresenceStatus, Presence, User as DiscordUser, Guild } from "discord.js";
import path from "node:path";

import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";
import { ai } from "./ai.ts";
import { sendChunks } from "./utils.ts";

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

		forum: {
			posts: number;
		};
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

	// Cache for total aggregated stats
	#statsCache: {
		lastUpdate: number;
		totalXp: number;
		totalMessages: number;
		totalVoiceMinutes: number;
		totalForumPosts: number;
		totalReactions: number;
	} | null = null;
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
	}

	get id() { this.touch(); return this.#discordUser.id; }
	get path() { this.touch(); return this.#storagePath; }
	get username() { this.touch(); return this.#discordUser.username; }
	get settings() { this.touch(); return this.#settings; }
	get lastAccessed() { this.touch(); return this.#lastAccessed; }

	touch() { this.#lastAccessed = Date.now(); }

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
	}

	setPresence(presence: Partial<Presence> | null) {
		if (this.settings.activity.record) {
			this.#currentActivity.activity = {
				activities: presence?.activities,
				status: presence?.status
			};
			this.#currentActivity.changed = true;

			this.touch();
		}
	}

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
	}

	async sendReplay(targetMonth?: Date): Promise<boolean> {
		this.#logger.debug("Replay generation requested...");

		const stats = await this.getAggregatedStats(targetMonth);

		if (stats.totalMessages > 0 || stats.totalVoiceMinutes > 0 || stats.totalForumPosts > 0 || stats.totalReactions > 0) {
			try {
				const replayText = await ai.generateReplay(this.username, {
					messages: stats.totalMessages,
					voiceMinutes: stats.totalVoiceMinutes,
					forumPosts: stats.totalForumPosts,
					reactions: stats.totalReactions
				});

				const discordUser = await client.discord?.users.fetch(this.id);
				if (discordUser) {
					await sendChunks(`## Your Monthly Replay!\n\n${replayText}`, discordUser.send.bind(discordUser));
					this.touch();
					return true;
				}
			} catch (error) {
				this.reportError("Failed to generate or send replay", error);
			}
		}

		this.touch();
		return false;
	}

	async getAggregatedStats(targetMonth?: Date) {
		let totalMessages = 0;
		let totalVoiceMinutes = 0;
		let totalForumPosts = 0;
		let totalReactions = 0;

		try {
			const activityPath = path.join(this.#storagePath, "activity");
			for await (const dirEntry of Deno.readDir(activityPath)) {
				if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(activityPath, dirEntry.name));
					const activity: UserActivity = JSON.parse(content);

					const activityDate = new Date(activity.date);

					// Filter by month if requested
					if (targetMonth && (activityDate.getMonth() !== targetMonth.getMonth() || activityDate.getFullYear() !== targetMonth.getFullYear())) continue;

					for (const guildId in activity.guilds) {
						const guildData = activity.guilds[guildId];

						totalMessages += guildData.messages?.sent || 0;
						totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
						totalForumPosts += guildData.forum?.posts || 0;

						for (const voiceId in guildData.voice) totalVoiceMinutes += Math.floor((guildData.voice[voiceId].time || 0) / 60000);
					}
				}
			}
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) {
				this.#logger.error("Failed to read activity history", { cause: error });
			}
		}

		// Also add the current activity if we are not filtering by an old month
		if (!targetMonth || (targetMonth.getMonth() === new Date().getMonth() && targetMonth.getFullYear() === new Date().getFullYear())) {
			for (const guildId in this.#currentActivity.guilds) {
				const guildData = this.#currentActivity.guilds[guildId];
				totalMessages += guildData.messages?.sent || 0;
				totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
				totalForumPosts += guildData.forum?.posts || 0;

				for (const voiceId in guildData.voice) totalVoiceMinutes += Math.floor((guildData.voice[voiceId].time || 0) / 60000);
			}
		}

		return { totalMessages, totalVoiceMinutes, totalForumPosts, totalReactions };
	}

	async getTotalStats() {
		if (!this.#statsCache || Date.now() - this.#statsCache.lastUpdate > 60000) {
			const stats = await this.getAggregatedStats();

			const totalXp = (stats.totalMessages * 5) + (stats.totalVoiceMinutes * 2) + (stats.totalForumPosts * 15) + (stats.totalReactions * 1);

			this.#statsCache = {
				lastUpdate: Date.now(),
				totalXp,
				...stats
			};
		}

		return this.#statsCache;
	}

	async getLevel() {
		const stats = await this.getTotalStats();
		// Dynamic level formula
		return Math.floor(Math.sqrt(stats.totalXp / 10));
	}

	addActivity(guildId: string, type: "message" | "mention" | "reactionAdd" | "reactionReceive" | "forumPost" | "voice", voiceChannelId?: string, voiceTime?: number) {
		this.#currentActivity.guilds[guildId] ??= { achievements: [], messages: { sent: 0, mentions: 0, reactions: { added: 0, received: 0 } }, voice: {}, forum: { posts: 0 } };

		const g = this.#currentActivity.guilds[guildId];

		if (type === "message") g.messages.sent++;
		if (type === "mention") g.messages.mentions++;
		if (type === "reactionAdd") g.messages.reactions.added++;
		if (type === "reactionReceive") g.messages.reactions.received++;
		if (type === "forumPost") g.forum.posts++;

		if (voiceChannelId && voiceTime && type === "voice") {
			g.voice[voiceChannelId] ??= { time: 0, joins: 0 };
			g.voice[voiceChannelId].time += voiceTime;
			g.voice[voiceChannelId].joins++;
		}

		this.#currentActivity.changed = true;
		if (this.#statsCache) this.#statsCache.lastUpdate = 0;
		this.touch();
	}

	async saveSettings() {
		await Deno.mkdir(this.#storagePath, {
			recursive: true
		});
		await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings));

		this.touch();
	}

	async delete(): Promise<void> {
		await Deno.remove(this.#storagePath, {
			recursive: true
		});
		this.#settings = {
			activity: {}
		};

		this.touch();
	}

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		this.touch();
	}
};