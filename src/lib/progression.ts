import type { User } from "./user.ts";

export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	check: (user: User) => Promise<boolean>;
}

export const achievements: AchievementDef[] = [
	{
		id: "message",
		name: "First Steps",
		description: "You sent your first message!",
		check: async (user) => (await user.getTotalStats()).totalMessages >= 1
	},
	{
		id: "messages_50",
		name: "Conversationalist",
		description: "You sent 50 messages.",
		check: async (user) => (await user.getTotalStats()).totalMessages >= 50
	},
	{
		id: "messages_100",
		name: "Chatterbox",
		description: "You sent 100 messages.",
		check: async (user) => (await user.getTotalStats()).totalMessages >= 100
	},
	{
		id: "messages_1000",
		name: "Grand Orator",
		description: "You sent 1000 messages.",
		check: async (user) => (await user.getTotalStats()).totalMessages >= 1000
	},
	{
		id: "stage_1",
		name: "Event Attendee",
		description: "You attended your first stage event.",
		check: async (user) => (await user.getTotalStats()).totalStageEvents >= 1
	},
	{
		id: "stage_10",
		name: "Event Fan",
		description: "You attended 10 stage events.",
		check: async (user) => (await user.getTotalStats()).totalStageEvents >= 10
	},
	{
		id: "forum",
		name: "Forum Initiate",
		description: "You created a forum post.",
		check: async (user) => (await user.getTotalStats()).totalForumPosts >= 1
	},
	{
		id: "forum_10",
		name: "Forum Regular",
		description: "You created 10 forum posts.",
		check: async (user) => (await user.getTotalStats()).totalForumPosts >= 10
	},
	{
		id: "reaction",
		name: "Reaction Initiate",
		description: "You gave or received your first reaction.",
		check: async (user) => (await user.getTotalStats()).totalReactions >= 1
	},
	{
		id: "reactions_5",
		name: "Reaction Trainee",
		description: "You gave or received 5 reactions.",
		check: async (user) => (await user.getTotalStats()).totalReactions >= 5
	},
	{
		id: "reactions_50",
		name: "Reaction Collector",
		description: "You gave or received 50 reactions.",
		check: async (user) => (await user.getTotalStats()).totalReactions >= 50
	},
	{
		id: "reactions_500",
		name: "Crowd Idol",
		description: "You gave or received 500 reactions.",
		check: async (user) => (await user.getTotalStats()).totalReactions >= 500
	},
	{
		id: "level_5",
		name: "Apprentice",
		description: "You reached level 5.",
		check: async (user) => (await user.getLevel()) >= 5
	},
	{
		id: "level_10",
		name: "Adept",
		description: "You reached level 10.",
		check: async (user) => (await user.getLevel()) >= 10
	},
	{
		id: "level_25",
		name: "Expert",
		description: "You reached level 25.",
		check: async (user) => (await user.getLevel()) >= 25
	},
	{
		id: "level_50",
		name: "Master",
		description: "You reached level 50.",
		check: async (user) => (await user.getLevel()) >= 50
	},
	{
		id: "level_75",
		name: "Grandmaster",
		description: "You reached level 75.",
		check: async (user) => (await user.getLevel()) >= 75
	},
	{
		id: "level_100",
		name: "Legend",
		description: "You reached level 100.",
		check: async (user) => (await user.getLevel()) >= 100
	}
];

export async function checkNewAchievements(user: User): Promise<string[]> {
	const unlocked: string[] = [];
	const userUnlocked = user.data.unlockedAchievements || [];

	for (const achievement of achievements) {
		if (!userUnlocked.includes(achievement.id)) {
			if (await achievement.check(user)) unlocked.push(achievement.id);
		}
	}
	return unlocked;
}

export function getLevelRewards(_level: number): string[] {
	const rewards: string[] = [];
	// Later we can implement role rewards per level
	return rewards;
}