import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";

let leaderboardCache: { data: any[], expires: number } | null = null;

export const command = {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("Displays the leaderboard of the most active members (Top XP).")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel
		]),

	async execute(_logger, interaction) {
		await interaction.deferReply();

		if (leaderboardCache && leaderboardCache.expires > Date.now()) {
			return sendLeaderboard(interaction, leaderboardCache.data);
		}

		const users = [];
		try {
			for await (const dirEntry of Deno.readDir("./storage/users/")) {
				if (dirEntry.isDirectory) {
					const user = await client.getUser(dirEntry.name);
					if (user) users.push(user);
				}
			}
		} catch (error) {
			await interaction.followUp("Error reading users data.");
			return;
		}

		const statsPromises = users.map(async (user) => {
			const stats = await user.getTotalStats();
			const level = await user.getLevel();
			return {
				id: user.id,
				username: user.username,
				xp: stats.totalXp,
				level,
				streak: user.data.streak || 0
			};
		});

		const leaderboardData = await Promise.all(statsPromises);
		leaderboardData.sort((a, b) => b.xp - a.xp);

		const top10 = leaderboardData.slice(0, 10);

		leaderboardCache = {
			data: top10,
			expires: Date.now() + 5 * 60 * 1000 // Cache for 5 minutes
		};

		await sendLeaderboard(interaction, top10);
	}
} satisfies Command<ChatInputCommandInteraction>;

async function sendLeaderboard(interaction: ChatInputCommandInteraction, top10: any[]) {
	const embed = new EmbedBuilder()
		.setTitle("Global Leaderboard (Top XP)")
		.setColor(0xFFD700)
		.setTimestamp();

	if (top10.length === 0) {
		embed.setDescription("No users found.");
	} else {
		const description = top10.map((user, index) => {
			const prefix = `${index + 1}.`;
			const streakText = user.streak >= 3 ? ` | Streak: ${user.streak}` : "";
			return `${prefix} **${user.username}** - Level ${user.level} (${user.xp} XP)${streakText}`;
		}).join("\n\n");
		embed.setDescription(description);
	}

	await interaction.followUp({ embeds: [embed] });
}