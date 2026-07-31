import { AttachmentBuilder, EmbedBuilder, type Activity, type PresenceStatus, type Presence, type User as DiscordUser } from "discord.js";
import path from "node:path";

import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";
import { ai } from "./ai.ts";
import { sendChunks } from "./utils.ts";
import { checkNewAchievements, achievements } from "./progression.ts";
import { generateRichPicture, RichPictureType } from "./richPicture.ts";

export type Achievement = {
	id: string;
	name: string;
	description: string;
};

export interface UserActivity {
	activity: {
		activities?: any[];
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

		stageEvents: {
			attended: number;
		};

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

export interface UserData {
	unlockedAchievements?: string[];
	streak?: number;
	bestStreak?: number;
	lastActiveDate?: string;
	bonusXp?: number;
	announceFunding?: boolean;
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
		totalStageEvents: number;
		totalForumPosts: number;
		totalReactions: number;
	} | null = null;
	#discordUser: DiscordUser;
	#logger: Logger;
	#storagePath: string;
	#settings: UserSettings = {
		activity: {
			record: true,
			replay: true
		}
	};
	#data: UserData = {};

	#lastAccessed: number = Date.now();

	constructor(logger: Logger, discordUser: DiscordUser) {
		this.#discordUser = discordUser;
		this.#logger = logger.clone(`[U-${discordUser.id}]`);
		this.#storagePath = `./storage/users/${discordUser.id}/`;
	}

	get id() { this.touch(); return this.#discordUser.id; }
	get path() { this.touch(); return this.#storagePath; }
	get username() { this.touch(); return this.#discordUser.username; }
	get displayName() { this.touch(); return this.#discordUser.globalName ?? this.#discordUser.username; }
	get settings() {
		return this.#settings;
	}

	get data() {
		return this.#data;
	}
	get lastAccessed() { this.touch(); return this.#lastAccessed; }

	async getGuildDisplayName(guildId: string): Promise<string> {
		this.touch();
		try {
			const guild = await client.discord?.guilds.fetch(guildId);
			const member = await guild?.members.fetch(this.#discordUser.id);
			if (member) return member.displayName;
		} catch {
			// Fallback
		}
		return this.displayName;
	}

	touch() { this.#lastAccessed = Date.now(); }

	async init() {
		this.#logger.debug("Initializing user...");
		client.addUser(this);

		try {
			try {
				const content = await Deno.readTextFile(path.join(this.#storagePath, "settings.json"));
				const parsed = JSON.parse(content);
				this.#settings = {
					...parsed,
					activity: {
						record: true,
						replay: true,
						...(parsed.activity || {})
					}
				};
				this.#logger.debug("Loaded existing user settings.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.#logger.debug("Created new user settings.");
				} else throw error;
			}
		} catch (error) {
			this.#logger.error("Failed to initialize user storage (settings.json)", {
				cause: error
			});
		}

		try {
			try {
				const content = await Deno.readTextFile(path.join(this.#storagePath, "data.json"));
				this.#data = JSON.parse(content);
				this.#logger.debug("Loaded existing user data.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveData();
					this.#logger.debug("Created new user data.");
				} else throw error;
			}
		} catch (error) {
			this.#logger.error("Failed to initialize user storage (data.json)", {
				cause: error
			});
		}

		try {
			const activityPath = path.join(this.#storagePath, "activity");
			let latestFile = "";
			for await (const dirEntry of Deno.readDir(activityPath)) {
				if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
					if (dirEntry.name > latestFile) latestFile = dirEntry.name;
				}
			}
			if (latestFile) {
				const content = await Deno.readTextFile(path.join(activityPath, latestFile));
				const savedActivity = JSON.parse(content);
				if (savedActivity && savedActivity.activity) {
					this.#currentActivity.activity = savedActivity.activity;
				}
			}
		} catch (error) {
			// Ignore if activity directory doesn't exist yet
		}

		this.touch();
	}

	setPresence(presence: Partial<Presence> | null) {
		if (this.settings.activity.record) {
			const mappedActivities = (presence?.activities || []).map(activity => ({
				name: activity.name,
				type: activity.type,
				state: activity.state,
				details: activity.details,
				applicationId: activity.applicationId
			})).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

			const newActivity = {
				activities: mappedActivities,
				status: presence?.status || "offline"
			};

			if (JSON.stringify(this.#currentActivity.activity) !== JSON.stringify(newActivity)) {
				this.#logger.debug(`Presence changed for ${this.username}. Old: ${JSON.stringify(this.#currentActivity.activity)} New: ${JSON.stringify(newActivity)}`);
				this.#currentActivity.activity = newActivity;
				this.#currentActivity.changed = true;
			}

			this.touch();
		}
	}

	async recordActivity() {
		if (this.#currentActivity.changed && this.settings.activity.record) {
			this.#logger.debug(`Saving activity to disk for ${this.username}...`);
			await Deno.mkdir(path.join(this.#storagePath, "activity"), {
				recursive: true
			});
			const unixTime = Math.floor(Date.now() / 1000);
			await Deno.writeTextFile(path.join(this.#storagePath, "activity", `${unixTime}.json`), JSON.stringify({
				...this.#currentActivity,
				date: unixTime
			}));

			this.#currentActivity = {
				activity: this.#currentActivity.activity,
				changed: false,
				date: new Date(),
				guilds: {}
			};

			this.touch();
		}
	}

	async sendReplay(_targetMonth?: Date): Promise<boolean> {
		this.#logger.debug("Replay generation disabled.");
		this.touch();
		return false;
	}

	async getAggregatedStats(targetMonth?: Date) {
		let totalMessages = 0;
		let totalStageEvents = 0;
		let totalForumPosts = 0;
		let totalReactions = 0;
		const monthlyAchievements: string[] = [];

		try {
			const activityPath = path.join(this.#storagePath, "activity");
			for await (const dirEntry of Deno.readDir(activityPath)) {
				if (dirEntry.isFile && dirEntry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(activityPath, dirEntry.name));
					const activity: UserActivity = JSON.parse(content);

					// Handle both milliseconds (old format) and seconds (new format)
					const timestamp = typeof activity.date === "number" && activity.date < 2000000000000 && activity.date < 3000000000 ? activity.date * 1000 : activity.date;
					const activityDate = new Date(timestamp);

					// Filter by month if requested
					if (targetMonth && (activityDate.getMonth() !== targetMonth.getMonth() || activityDate.getFullYear() !== targetMonth.getFullYear())) continue;

					for (const guildId in activity.guilds) {
						const guildData = activity.guilds[guildId];

						totalMessages += guildData.messages?.sent || 0;
						totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
						totalForumPosts += guildData.forum?.posts || 0;
						totalStageEvents += guildData.stageEvents?.attended || 0;

						if (guildData.achievements) {
							for (const achievement of guildData.achievements) monthlyAchievements.push(achievement.name);
						}
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
				totalStageEvents += guildData.stageEvents?.attended || 0;

				if (guildData.achievements) {
					for (const achievement of guildData.achievements) monthlyAchievements.push(achievement.name);
				}
			}
		}

		return { totalMessages, totalStageEvents, totalForumPosts, totalReactions, achievements: monthlyAchievements };
	}

	async getTotalStats() {
		if (!this.#statsCache || Date.now() - this.#statsCache.lastUpdate > 60000) {
			const stats = await this.getAggregatedStats();

			let totalXp = (stats.totalMessages * 10) + (stats.totalStageEvents * 2500) + (stats.totalForumPosts * 250) + (stats.totalReactions * 1);
			if (this.#data.bonusXp) totalXp += this.#data.bonusXp;

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
		return Math.floor(Math.sqrt(stats.totalXp / 50));
	}

	async addActivity(guildId: string, type: "message" | "mention" | "reactionAdd" | "reactionReceive" | "forumPost" | "stageEvent") {
		this.#logger.debug(`Recording activity [${type}] for ${this.username}`);
		const oldLevel = await this.getLevel();

		const todayDate = new Date();
		const today = todayDate.toISOString().split("T")[0];

		let streakChanged = false;
		if (this.#data.lastActiveDate !== today) {
			const yesterdayDate = new Date();
			yesterdayDate.setDate(yesterdayDate.getDate() - 1);
			const yesterday = yesterdayDate.toISOString().split("T")[0];

			if (!this.#data.lastActiveDate || this.#data.lastActiveDate < yesterday) this.#data.streak = 1;
			else if (this.#data.lastActiveDate === yesterday) {
				this.#data.streak = (this.#data.streak || 1) + 1;
				const bonus = Math.min(this.#data.streak * 5, 50);
				this.#data.bonusXp = (this.#data.bonusXp || 0) + bonus;
			}

			if (!this.#data.bestStreak || (this.#data.streak && this.#data.streak > this.#data.bestStreak)) this.#data.bestStreak = this.#data.streak;

			this.#data.lastActiveDate = today;
			streakChanged = true;
		}

		this.#currentActivity.guilds[guildId] ??= { achievements: [], messages: { sent: 0, mentions: 0, reactions: { added: 0, received: 0 } }, stageEvents: { attended: 0 }, forum: { posts: 0 } };

		const guildActivity = this.#currentActivity.guilds[guildId];

		if (type === "message") guildActivity.messages.sent++;
		if (type === "mention") guildActivity.messages.mentions++;
		if (type === "reactionAdd") guildActivity.messages.reactions.added++;
		if (type === "reactionReceive") guildActivity.messages.reactions.received++;
		if (type === "forumPost") guildActivity.forum.posts++;
		if (type === "stageEvent") guildActivity.stageEvents.attended++;

		this.#currentActivity.changed = true;
		if (this.#statsCache) this.#statsCache.lastUpdate = 0;
		if (this.#statsCache && streakChanged) this.#statsCache.lastUpdate = 0;
		this.touch();

		const newLevel = await this.getLevel();
		const unlockedAchievementIds = await checkNewAchievements(this);

		if (newLevel > oldLevel || unlockedAchievementIds.length > 0 || streakChanged) {
			if (unlockedAchievementIds.length > 0) {
				this.#data.unlockedAchievements ??= [];
				this.#data.unlockedAchievements.push(...unlockedAchievementIds);

				for (const id of unlockedAchievementIds) {
					const achievement = achievements.find((achievement) => achievement.id === id);
					if (achievement) guildActivity.achievements.push({ id: achievement.id, name: achievement.name, description: achievement.description });
				}
			}
			if (streakChanged || unlockedAchievementIds.length > 0) {
				await this.saveSettings();
				await this.saveData();
			}

			try {
				const guild = await client.getGuild(guildId);
				const botChannelId = guild?.settings.channels.bot;

				if (botChannelId) {
					const discordGuild = await client.discord?.guilds.fetch(guildId);
					const botChannel = await discordGuild?.channels.fetch(botChannelId);

					if (botChannel && botChannel.isTextBased()) {
						const displayName = await this.getGuildDisplayName(guildId);
						const files = [];

						if (newLevel > oldLevel) {
							const levelUpBuffer = await generateRichPicture({
								type: RichPictureType.LevelUp,
								data: {
									username: displayName,
									avatarUrl: this.#discordUser.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
									oldLevel,
									newLevel
								}
							});
							files.push(new AttachmentBuilder(levelUpBuffer, { name: "levelup.png" }));
						}

						if (unlockedAchievementIds.length > 0) {
							for (const id of unlockedAchievementIds) {
								const achievement = achievements.find((a) => a.id === id);
								if (achievement) {
									const achievementBuffer = await generateRichPicture({
										type: RichPictureType.Achievement,
										data: {
											username: displayName,
											avatarUrl: this.#discordUser.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
											achievementName: achievement.name,
											achievementDescription: achievement.description
										}
									});
									files.push(new AttachmentBuilder(achievementBuffer, { name: `achievement-${id}.png` }));
								}
							}
						}

						if (files.length > 0) {
							let content = `<@${this.#discordUser.id}>`;
							if (newLevel > oldLevel && unlockedAchievementIds.length > 0) content += ", you leveled up and unlocked an achievement!";
							else if (newLevel > oldLevel) content += ", you leveled up!";
							else content += ", you unlocked an achievement!";

							await botChannel.send({ content, files });
						}
					}
				}
			} catch (error) {
				this.#logger.error("Failed to send level up/achievement notification", { cause: error });
			}
		}
	}

	async saveSettings() {
		try {
			await Deno.mkdir(this.#storagePath, {
				recursive: true
			});
			await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings, null, "\t"));
		} catch (error) {
			this.#logger.error("Failed to save user settings", {
				cause: error
			});
		}
	}

	async saveData() {
		try {
			await Deno.mkdir(this.#storagePath, {
				recursive: true
			});
			await Deno.writeTextFile(path.join(this.#storagePath, "data.json"), JSON.stringify(this.#data, null, "\t"));
		} catch (error) {
			this.#logger.error("Failed to save user data", {
				cause: error
			});
		}
	}

	async delete(): Promise<void> {
		await Deno.remove(this.#storagePath, {
			recursive: true
		});
		this.#settings = {
			activity: {}
		};
		this.#data = {};

		this.touch();
	}

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		this.touch();
	}
};