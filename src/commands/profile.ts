import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";
import { checkNewAchievements, achievements } from "../lib/progression.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("profile")
		.setDescription("Display your profile, stats, and level.")
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
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const user = await client.getUser(interaction.user.id);
		if (!user) {
			await interaction.followUp("Unable to load your profile.");
			return;
		}

		const stats = await user.getTotalStats();
		const level = await user.getLevel();
		const unlockedAchievementIds = await checkNewAchievements(user);

		const achievementsText = unlockedAchievementIds.length > 0 ? unlockedAchievementIds.map((id) => achievements.find(a => a.id === id)?.name).join(", ") : "No achievements unlocked for now.";

		const embed = new EmbedBuilder()
			.setTitle(`${user.username}'${user.username.endsWith("s") ? "" : "s"} Profile`)
			.setColor(0x5865F2)
			.setDescription("Here are your stats and achievements. Keep being active to level up and unlock more achievements!")
			.addFields(
				{ name: "Level", value: `**${level}** (Total XP: ${stats.totalXp})`, inline: false },
				{ name: "Streak", value: user.data.streak ? `${user.data.streak} days` + (user.data.bestStreak && user.data.bestStreak > user.data.streak ? ` (Best: ${user.data.bestStreak})` : "") : "None", inline: true },
				{ name: "Messages", value: `${stats.totalMessages}`, inline: true },
				{ name: "Stage Events", value: `${stats.totalStageEvents}`, inline: true },
				{ name: "Forum Posts", value: `${stats.totalForumPosts}`, inline: true },
				{ name: "Reactions", value: `${stats.totalReactions}`, inline: true },
				{ name: "Unlocked Achievements", value: achievementsText, inline: false }
			)
			.setThumbnail(interaction.user.displayAvatarURL())
			.setTimestamp();

		await interaction.followUp({ embeds: [embed] });
	}
} satisfies Command<ChatInputCommandInteraction>;