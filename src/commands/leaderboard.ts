import {
	ApplicationIntegrationType,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	InteractionContextType,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";

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
	const entries = await Promise.all(top10.map(async (user, index) => {
		let displayName = user.username;
		let avatarUrl: string | undefined = undefined;

		if (interaction.guild) {
			const member = await interaction.guild.members.fetch(user.id).catch(() => null);
			if (member) {
				displayName = member.displayName;
				avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });
			}
		}

		if (!avatarUrl) {
			const discordUser = await client.discord?.users.fetch(user.id).catch(() => null);
			if (discordUser) {
				avatarUrl = discordUser.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });
				if (displayName === user.username) displayName = discordUser.globalName ?? discordUser.username;
			}
		}

		return {
			rank: index + 1,
			username: displayName,
			avatarUrl,
			level: user.level,
			xp: user.xp,
			streak: user.streak
		};
	}));

	const pictureBuffer = await generateRichPicture({
		type: RichPictureType.Leaderboard,
		data: { entries }
	});

	const attachment = new AttachmentBuilder(pictureBuffer, { name: "leaderboard.png" });

	await interaction.followUp({ files: [attachment] });
}