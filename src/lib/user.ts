import { type Activity, AttachmentBuilder, type Presence, type PresenceStatus, type User as DiscordUser } from "discord.js";
import path from "node:path";

import { achievements, checkNewAchievements } from "./achievements.ts";
import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";
import { generateRichPicture, RichPictureType } from "./richPicture.ts";
import { getStoragePath } from "./utils.ts";

export type Achievement = {
	id: string;
	name: string;
	description: string;
};

export interface UserMappedActivity {
	name: string;
	type: number;
	state?: string;
	details?: string;
	applicationId?: string;
};

export interface UserActivity {
	presence: {
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
	birthday?: {
		day: number;
		month: number;
	};
	stats?: {
		totalMessages: number;
		totalStageEvents: number;
		totalForumPosts: number;
		totalReactions: number;
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

export interface UserReplayStats {
	messages: number;
	stageEvents: number;
	forumPosts: number;
	reactions: number;
	achievements: string[];
	streak: number;
	bestStreak: number;
};

export class User {
	private currentActivity: UserActivity = {
		presence: null,
		changed: false,
		date: new Date(),
		guilds: {}
	};

	// Cache for total aggregated stats
	private statsCache: {
		lastUpdate: number;
		totalXp: number;
		totalMessages: number;
		totalStageEvents: number;
		totalForumPosts: number;
		totalReactions: number;
	} | null = null;
	private discord: DiscordUser;
	private logger: Logger;

	storagePath: string;
	data: UserData = {};

	settings: UserSettings = {
		activity: {
			record: true,
			replay: true
		}
	};
	lastAccessed: number = Date.now();

	constructor(logger: Logger, discordUser: DiscordUser) {
		this.discord = discordUser;
		this.logger = logger.clone(`[U-${discordUser.id}]`);
		this.storagePath = getStoragePath("users", discordUser.id);
	};

	get id() { return this.discord.id };
	get username() { return this.discord.username };
	get displayName() { return this.discord.globalName ?? this.discord.username };
	avatarDecoration(animated = true): string | null { return this.discord.avatarDecorationData?.skuId ? `https://cdn.discordapp.com/media/v1/collectibles-shop/${this.discord.avatarDecorationData?.skuId}/${animated ? "animated" : "static"}` : null };
	nameplate(animated = true): { palette: string, url: string } | null { return this.discord.collectibles?.nameplate?.skuId ? { palette: this.discord.collectibles.nameplate.palette, url: `https://cdn.discordapp.com/media/v1/collectibles-shop/${this.discord.collectibles.nameplate.skuId}/${animated ? "animated" : "static"}` } : null };
	get presence() { return this.currentActivity.presence };

	avatar(extension?: "webp" | "png" | "jpg" | "jpeg" | "gif", size?: number, animated = true): string {
		const url = new URL(this.discord.displayAvatarURL({ extension, size, forceStatic: !animated }));
		if (animated) url.searchParams.set("animated", "true");
		return url.toString();
	};

	async displayNameStyle() {
		const response = await client.discord?.rest.get(`/users/${this.discord.id}`) as { display_name_styles?: { colors: number[], effect_id: string, font_id: string } } | null;
		return response?.display_name_styles;
	};

	touch() { this.lastAccessed = Date.now() };

	async getGuildDisplayName(guildId?: string): Promise<string> {
		if (guildId) {
			try {
				const guild = await client.discord?.guilds.fetch(guildId);
				const member = await guild?.members.fetch(this.discord.id);
				if (member) return member.displayName;
			} catch {
				// Fallback
			}
		}

		this.touch();

		return this.displayName;
	};

	async init() {
		this.logger.debug("Initializing user...");
		client.addUser(this);

		try {
			try {
				const content = await Deno.readTextFile(path.join(this.storagePath, "settings.json"));
				const parsed = JSON.parse(content);
				this.settings = {
					...parsed,
					activity: {
						record: true,
						replay: true,
						...(parsed.activity || {})
					}
				};
				this.logger.debug("Loaded existing user settings.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.logger.debug("Created new user settings.");
				} else throw error;
			}
		} catch (error) {
			this.logger.error("Failed to initialize user storage (settings.json)", {
				cause: error
			});
		}

		try {
			try {
				const content = await Deno.readTextFile(path.join(this.storagePath, "data.json"));
				this.data = JSON.parse(content);
				this.logger.debug("Loaded existing user data.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveData();
					this.logger.debug("Created new user data.");
				} else throw error;
			}
		} catch (error) {
			this.logger.error("Failed to initialize user storage (data.json)", {
				cause: error
			});
		}

		try {
			const presencePath = path.join(this.storagePath, "activity");
			let latestFile = "";
			for await (const directoryEntry of Deno.readDir(presencePath)) {
				if (directoryEntry.isFile && directoryEntry.name.endsWith(".json")) {
					if (directoryEntry.name > latestFile) latestFile = directoryEntry.name;
				}
			}

			if (latestFile) {
				const content = await Deno.readTextFile(path.join(presencePath, latestFile));
				const savedPresence = JSON.parse(content);
				if (savedPresence && savedPresence.presence) this.currentActivity.presence = savedPresence.presence;
			}
		} catch {
			// Ignore if presence directory doesn't exist yet
		}

		this.touch();
	};

	setPresence(presence: Partial<Presence> | null) {
		const newPresence = {
			activities: presence?.activities || [],
			status: presence?.status || "offline"
		};

		if (JSON.stringify(this.currentActivity.presence) !== JSON.stringify(newPresence)) {
			this.currentActivity.presence = newPresence;

			if (this.settings.activity.record) {
				this.logger.debug(`Presence changed for ${this.username}.Old: ${JSON.stringify(this.currentActivity.presence)} New: ${JSON.stringify(newPresence)} `);
				this.currentActivity.changed = true;
			} else this.currentActivity.changed = false;
		}

		this.touch();
	};

	async recordActivity() {
		if (this.currentActivity.changed && this.settings.activity.record) {
			this.logger.debug(`Saving activity to disk for ${this.username}...`);
			const activityDirectory = path.join(this.storagePath, "activity");
			await Deno.mkdir(activityDirectory, { recursive: true });

			const now = new Date();
			const yearMonth = `${now.getFullYear()} -${String(now.getMonth() + 1).padStart(2, "0")} `;
			const monthFilePath = path.join(activityDirectory, `${yearMonth}.json`);

			let monthData: any = { yearMonth, guilds: {} };
			try {
				const existingContent = await Deno.readTextFile(monthFilePath);
				monthData = JSON.parse(existingContent);
			} catch (error) {
				if (!(error instanceof Deno.errors.NotFound)) this.logger.error("Failed to read monthly activity file", { cause: error });
			}

			this.data.stats ??= { totalMessages: 0, totalStageEvents: 0, totalForumPosts: 0, totalReactions: 0 };

			for (const guildId in this.currentActivity.guilds) {
				const currentGuild = this.currentActivity.guilds[guildId];
				monthData.guilds[guildId] ??= { achievements: [], messages: { sent: 0, mentions: 0, reactions: { added: 0, received: 0 } }, stageEvents: { attended: 0 }, forum: { posts: 0 } };
				const targetGuild = monthData.guilds[guildId];

				const sent = currentGuild.messages?.sent || 0;
				const mentions = currentGuild.messages?.mentions || 0;
				const added = currentGuild.messages?.reactions?.added || 0;
				const received = currentGuild.messages?.reactions?.received || 0;
				const posts = currentGuild.forum?.posts || 0;
				const attended = currentGuild.stageEvents?.attended || 0;

				targetGuild.messages.sent += sent;
				targetGuild.messages.mentions += mentions;
				targetGuild.messages.reactions.added += added;
				targetGuild.messages.reactions.received += received;
				targetGuild.forum.posts += posts;
				targetGuild.stageEvents.attended += attended;

				/** @type {UserMappedActivity[]} */
				const mappedActivities = (this.currentActivity.presence?.activities || []).map((activity) => ({
					name: activity.name,
					type: activity.type,
					state: activity.state,
					details: activity.details,
					applicationId: activity.applicationId
				})).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

				this.data.stats.totalMessages += sent;
				this.data.stats.totalForumPosts += posts;
				this.data.stats.totalStageEvents += attended;
				this.data.stats.totalReactions += (added + received);

				if (currentGuild.achievements) {
					targetGuild.achievements ??= [];
					targetGuild.achievements.push(...currentGuild.achievements);
				}
			}

			const tmpMonthPath = `${monthFilePath}.tmp`;
			await Deno.writeTextFile(tmpMonthPath, JSON.stringify(monthData));
			await Deno.rename(tmpMonthPath, monthFilePath);
			await this.saveData();

			this.currentActivity = {
				presence: this.currentActivity.presence,
				changed: false,
				date: new Date(),
				guilds: {}
			};

			this.touch();
		}
	};

	async sendReplay(_targetMonth?: Date): Promise<boolean> {
		this.logger.debug("Replay generation is disabled for now.");
		this.touch();
		return false;
	};

	async getRecentStats(days = 28) {
		let totalMessages = 0;
		let totalStageEvents = 0;
		let totalForumPosts = 0;
		let totalReactions = 0;

		const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

		try {
			const activityPath = path.join(this.storagePath, "activity");
			for await (const directoryEntry of Deno.readDir(activityPath)) {
				if (directoryEntry.isFile && directoryEntry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(activityPath, directoryEntry.name));
					const activity: any = JSON.parse(content);

					const timestamp = typeof activity.date === "number" && activity.date < 3000000000 ? activity.date * 1000 : Number(activity.date) || 0;
					if (!activity.date || timestamp >= cutoff || directoryEntry.name.length === 7) {
						for (const guildId in activity.guilds) {
							const guildData = activity.guilds[guildId];
							totalMessages += guildData.messages?.sent || 0;
							totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
							totalForumPosts += guildData.forum?.posts || 0;
							totalStageEvents += guildData.stageEvents?.attended || 0;
						}
					}
				}
			}
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) this.logger.error("Failed to read recent activity", { cause: error });
		}

		for (const guildId in this.currentActivity.guilds) {
			const guildData = this.currentActivity.guilds[guildId];
			totalMessages += guildData.messages?.sent || 0;
			totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
			totalForumPosts += guildData.forum?.posts || 0;
			totalStageEvents += guildData.stageEvents?.attended || 0;
		}

		this.touch();
		return { totalMessages, totalStageEvents, totalForumPosts, totalReactions };
	};

	async getAggregatedStats(targetMonth?: Date) {
		let totalMessages = 0;
		let totalStageEvents = 0;
		let totalForumPosts = 0;
		let totalReactions = 0;
		const monthlyAchievements: string[] = [];

		try {
			const activityPath = path.join(this.storagePath, "activity");
			for await (const directoryEntry of Deno.readDir(activityPath)) {
				if (directoryEntry.isFile && directoryEntry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(activityPath, directoryEntry.name));
					const activity: UserActivity = JSON.parse(content);

					const timestamp = typeof activity.date === "number" && activity.date < 2000000000000 && activity.date < 3000000000 ? activity.date * 1000 : activity.date;
					const activityDate = new Date(timestamp);

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
				this.logger.error("Failed to read activity history", { cause: error });
			}
		}

		if (!targetMonth || (targetMonth.getMonth() === new Date().getMonth() && targetMonth.getFullYear() === new Date().getFullYear())) {
			for (const guildId in this.currentActivity.guilds) {
				const guildData = this.currentActivity.guilds[guildId];
				totalMessages += guildData.messages?.sent || 0;
				totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
				totalForumPosts += guildData.forum?.posts || 0;
				totalStageEvents += guildData.stageEvents?.attended || 0;

				if (guildData.achievements) {
					for (const achievement of guildData.achievements) monthlyAchievements.push(achievement.name);
				}
			}
		}

		this.touch();
		return { totalMessages, totalStageEvents, totalForumPosts, totalReactions, achievements: monthlyAchievements };
	};

	async getTotalStats() {
		if (this.data.stats) {
			let totalMessages = this.data.stats.totalMessages || 0;
			let totalStageEvents = this.data.stats.totalStageEvents || 0;
			let totalForumPosts = this.data.stats.totalForumPosts || 0;
			let totalReactions = this.data.stats.totalReactions || 0;

			for (const guildId in this.currentActivity.guilds) {
				const guildData = this.currentActivity.guilds[guildId];
				totalMessages += guildData.messages?.sent || 0;
				totalStageEvents += guildData.stageEvents?.attended || 0;
				totalForumPosts += guildData.forum?.posts || 0;
				totalReactions += (guildData.messages?.reactions?.added || 0) + (guildData.messages?.reactions?.received || 0);
			}

			let totalXp = (totalMessages * 10) + (totalStageEvents * 2500) + (totalForumPosts * 250) + (totalReactions * 1);
			if (this.data.bonusXp) totalXp += this.data.bonusXp;

			this.touch();
			return { totalMessages, totalStageEvents, totalForumPosts, totalReactions, totalXp, achievements: [] };
		}

		if (!this.statsCache || Date.now() - this.statsCache.lastUpdate > 60000) {
			const stats = await this.getAggregatedStats();

			let totalXp = (stats.totalMessages * 10) + (stats.totalStageEvents * 2500) + (stats.totalForumPosts * 250) + (stats.totalReactions * 1);
			if (this.data.bonusXp) totalXp += this.data.bonusXp;

			this.statsCache = {
				lastUpdate: Date.now(),
				totalXp,
				...stats
			};
		}

		this.touch();
		return this.statsCache;
	};

	async getLevel() {
		const stats = await this.getTotalStats();
		return Math.floor(Math.sqrt(stats.totalXp / 50));
	};

	async addActivity(guildId: string, type: "message" | "mention" | "reactionAdd" | "reactionReceive" | "forumPost" | "stageEvent") {
		this.logger.debug(`Recording activity[${type}]for ${this.username}`);
		const oldLevel = await this.getLevel();

		const todayDate = new Date();
		const today = todayDate.toISOString().split("T")[0];

		let streakChanged = false;
		if (this.data.lastActiveDate !== today) {
			const yesterdayDate = new Date();
			yesterdayDate.setDate(yesterdayDate.getDate() - 1);
			const yesterday = yesterdayDate.toISOString().split("T")[0];

			if (!this.data.lastActiveDate || this.data.lastActiveDate < yesterday) this.data.streak = 1;
			else if (this.data.lastActiveDate === yesterday) {
				this.data.streak = (this.data.streak || 1) + 1;
				const bonus = Math.min(this.data.streak * 5, 50);
				this.data.bonusXp = (this.data.bonusXp || 0) + bonus;
			}

			if (!this.data.bestStreak || (this.data.streak && this.data.streak > this.data.bestStreak)) this.data.bestStreak = this.data.streak;

			this.data.lastActiveDate = today;
			streakChanged = true;
		}

		this.currentActivity.guilds[guildId] ??= { achievements: [], messages: { sent: 0, mentions: 0, reactions: { added: 0, received: 0 } }, stageEvents: { attended: 0 }, forum: { posts: 0 } };

		const guildActivity = this.currentActivity.guilds[guildId];

		if (type === "message") guildActivity.messages.sent++;
		if (type === "mention") guildActivity.messages.mentions++;
		if (type === "reactionAdd") guildActivity.messages.reactions.added++;
		if (type === "reactionReceive") guildActivity.messages.reactions.received++;
		if (type === "forumPost") guildActivity.forum.posts++;
		if (type === "stageEvent") guildActivity.stageEvents.attended++;

		this.currentActivity.changed = true;
		if (this.statsCache) this.statsCache.lastUpdate = 0;
		if (this.statsCache && streakChanged) this.statsCache.lastUpdate = 0;
		this.touch();

		const newLevel = await this.getLevel();
		const unlockedAchievementIds = await checkNewAchievements(this);

		if (newLevel > oldLevel || unlockedAchievementIds.length > 0 || streakChanged) {
			if (unlockedAchievementIds.length > 0) {
				this.data.unlockedAchievements ??= [];
				this.data.unlockedAchievements.push(...unlockedAchievementIds);

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
									avatarUrl: this.avatar("png", 256, false),
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
											avatarUrl: this.avatar("png", 256, false),
											achievementName: achievement.name,
											achievementDescription: achievement.description
										}
									});
									files.push(new AttachmentBuilder(achievementBuffer, { name: `achievement - ${id}.png` }));
								}
							}
						}

						if (files.length > 0) {
							let content = `< @${this.discord.id}> `;
							if (newLevel > oldLevel && unlockedAchievementIds.length > 0) content += ", you leveled up and unlocked an achievement!";
							else if (newLevel > oldLevel) content += ", you leveled up!";
							else content += ", you unlocked an achievement!";

							await botChannel.send({ content, files });
						}
					}
				}
			} catch (error) {
				this.logger.error("Failed to send level up/achievement notification", { cause: error });
			}
		}
	};

	async saveSettings() {
		try {
			await Deno.mkdir(this.storagePath, { recursive: true });
			const tmpPath = path.join(this.storagePath, "settings.json.tmp");
			const targetPath = path.join(this.storagePath, "settings.json");
			await Deno.writeTextFile(tmpPath, JSON.stringify(this.settings, null, "\t"));
			await Deno.rename(tmpPath, targetPath);
		} catch (error) {
			this.logger.error("Failed to save user settings", { cause: error });
		}

		this.touch();
	};

	async saveData() {
		try {
			await Deno.mkdir(this.storagePath, { recursive: true });
			const tmpPath = path.join(this.storagePath, "data.json.tmp");
			const targetPath = path.join(this.storagePath, "data.json");
			await Deno.writeTextFile(tmpPath, JSON.stringify(this.data, null, "\t"));
			await Deno.rename(tmpPath, targetPath);
		} catch (error) {
			this.logger.error("Failed to save user data", { cause: error });
		}

		this.touch();
	};

	async delete(): Promise<void> {
		await Deno.remove(this.storagePath, {
			recursive: true
		});
		this.settings = {
			activity: {}
		};
		this.data = {};

		this.touch();
	};

	reportError(message: string, error: unknown) {
		this.logger.error(message, {
			cause: error
		});

		this.touch();
	};
};