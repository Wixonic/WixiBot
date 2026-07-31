import {
	ApplicationIntegrationType,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";
import { checkNewAchievements } from "../lib/progression.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("profile")
		.setDescription("Display a profile, stats, and level.")
		.addUserOption((option) => option
			.setName("user")
			.setDescription("The user whose profile you want to view.")
			.setRequired(false)
		)
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

		const targetUser = interaction.options.getUser("user") ?? interaction.user;
		if (targetUser.bot) {
			await interaction.followUp("Bots do not have profiles.");
			return;
		}

		const targetMember = interaction.options.getMember("user") ?? interaction.member;

		const user = await client.getUser(targetUser.id);
		if (!user) {
			await interaction.followUp("Unable to load profile for this user.");
			return;
		}

		const stats = await user.getTotalStats();
		const level = await user.getLevel();
		const unlockedAchievementIds = await checkNewAchievements(user);

		const displayName = targetMember && "displayName" in targetMember ? (targetMember.displayName as string) : (targetUser.globalName ?? user.displayName);

		const pictureBuffer = await generateRichPicture({
			type: RichPictureType.Profile,
			data: {
				username: displayName,
				avatarUrl: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
				level,
				xp: stats.totalXp,
				streak: user.data.streak,
				bestStreak: user.data.bestStreak,
				messages: stats.totalMessages,
				stageEvents: stats.totalStageEvents,
				forumPosts: stats.totalForumPosts,
				reactions: stats.totalReactions,
				achievementsCount: unlockedAchievementIds.length
			}
		});

		const attachment = new AttachmentBuilder(pictureBuffer, { name: "profile.png" });

		await interaction.followUp({ files: [attachment] });
	}
} satisfies Command<ChatInputCommandInteraction>;