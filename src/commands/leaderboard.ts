import {
	ApplicationIntegrationType,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";
import { getStoragePath } from "../lib/utils.ts";

interface LeaderboardUserStatistics {
	id: string;
	xp: number;
	level: number;
	streak: number;
};

let leaderboardCache: { data: LeaderboardUserStatistics[], updatedAt: number, expires: number } | null = null;

const sendLeaderboard = async (_logger: Logger, interaction: ChatInputCommandInteraction, topUsers: LeaderboardUserStatistics[], updatedAt: number) => {
	const entries = await Promise.all(topUsers.map(async (leaderboardUser, index) => {
		const user = await client.getUser(leaderboardUser.id);
		const displayName = user ? await user.getGuildDisplayName(interaction.guildId ?? undefined) : leaderboardUser.id;
		const avatarUrl = user?.avatar("webp", 256, false);
		const avatarDecorationUrl = user?.avatarDecoration(false) ?? undefined;
		const displayNameStyle = await user?.displayNameStyle();

		return {
			rank: index + 1,
			username: displayName,
			avatarUrl,
			avatarDecorationUrl,
			displayNameStyle,
			level: leaderboardUser.level,
			xp: leaderboardUser.xp,
			streak: leaderboardUser.streak
		};
	}));

	const pictureBuffer = await generateRichPicture({
		type: RichPictureType.Leaderboard,
		data: { entries }
	});

	const attachment = new AttachmentBuilder(pictureBuffer, { name: "leaderboard.png" });
	const updatedTimestamp = Math.floor(updatedAt / 1000);

	await interaction.followUp({ content: `-# Updated <t:${updatedTimestamp}:R>`, files: [attachment] });
};

export const command = {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("Displays the leaderboard of the most active members (Top XP).")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild
		]),

	async execute(logger, interaction) {
		await interaction.deferReply();

		if (leaderboardCache && leaderboardCache.expires > Date.now()) return sendLeaderboard(logger, interaction, leaderboardCache.data, leaderboardCache.updatedAt);

		const userDirectoryNames: string[] = [];
		try {
			for await (const directoryEntry of Deno.readDir(getStoragePath("users"))) {
				if (directoryEntry.isDirectory) userDirectoryNames.push(directoryEntry.name);
			}
		} catch (error) {
			logger.error("Failed to read users storage directory", { cause: error });
			await interaction.followUp("Error reading users data.");
			return;
		}

		const statisticsPromises = userDirectoryNames.map(async (userId) => {
			const loadedUser = client.users.get(userId);
			if (loadedUser) {
				const statistics = await loadedUser.getTotalStats();
				return {
					id: loadedUser.id,
					xp: statistics.totalXp,
					level: Math.floor(Math.sqrt(statistics.totalXp / 50)),
					streak: loadedUser.data.streak || 0
				};
			}

			try {
				const content = await Deno.readTextFile(getStoragePath("users", userId, "data.json"));
				const data = JSON.parse(content);
				let totalXp = 0;

				if (data.stats) totalXp = ((data.stats.totalMessages || 0) * 10) + ((data.stats.totalStageEvents || 0) * 2500) + ((data.stats.totalForumPosts || 0) * 250) + ((data.stats.totalReactions || 0) * 1);
				if (data.bonusXp) totalXp += data.bonusXp;

				return {
					id: userId,
					xp: totalXp,
					level: Math.floor(Math.sqrt(totalXp / 50)),
					streak: data.streak || 0
				};
			} catch (error) {
				logger.warn(`Failed to read user data for ${userId}`, { cause: error });
				return null;
			}
		});

		const leaderboardData = (await Promise.all(statisticsPromises)).filter((item): item is NonNullable<typeof item> => item !== null);
		leaderboardData.sort((firstUser, secondUser) => secondUser.xp - firstUser.xp);

		const topUsers = leaderboardData.slice(0, 10);
		const updatedAt = Date.now();

		leaderboardCache = {
			data: topUsers,
			updatedAt,
			expires: updatedAt + 5 * 60 * 1000
		};

		await sendLeaderboard(logger, interaction, topUsers, updatedAt);
	}
} satisfies Command<ChatInputCommandInteraction>;