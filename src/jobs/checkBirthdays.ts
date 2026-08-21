import { AttachmentBuilder } from "discord.js";
import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";
import { getStoragePath } from "../lib/utils.ts";

export const job: Job = {
	cron: "0 0 * * *",
	name: "Check Birthdays",
	async execute(logger: Logger) {
		if (!client.discord) {
			logger.warn("Skipped birthday check: Discord client unavailable.");
			return;
		}

		logger.debug("Running daily birthday check...");

		const now = new Date();
		const currentDay = now.getDate();
		const currentMonth = now.getMonth() + 1;

		const todayBirthdayUserIds = new Set<string>();

		try {
			for await (const dirEntry of Deno.readDir(getStoragePath("users"))) {
				if (!dirEntry.isDirectory) continue;
				const user = await client.getUser(dirEntry.name);
				if (user?.data.birthday) {
					if (user.data.birthday.day === currentDay && user.data.birthday.month === currentMonth) todayBirthdayUserIds.add(user.id);
				}
			}
		} catch (error) {
			logger.error("Failed to scan user birthdays", { cause: error });
			return;
		}

		logger.debug(`Found ${todayBirthdayUserIds.size} user(s) with a birthday today.`);

		for (const discordGuild of client.discord.guilds.cache.values()) {
			const guild = await client.getGuild(discordGuild.id);
			if (!guild) continue;

			const birthdayChannelId = guild.settings.channels?.birthday;
			const birthdayRoleId = guild.settings.roles?.birthday;

			if (birthdayRoleId) {
				try {
					const members = await discordGuild.members.fetch();
					for (const member of members.values()) {
						const hasRole = member.roles.cache.has(birthdayRoleId);
						const isBirthdayToday = todayBirthdayUserIds.has(member.id);

						if (hasRole && !isBirthdayToday) {
							await member.roles.remove(birthdayRoleId, "Birthday over").catch(() => null);
							logger.debug(`Removed birthday role from ${member.user.tag} in ${discordGuild.name}.`);
						}
					}
				} catch (error) {
					logger.error(`Failed to manage birthday roles in guild ${discordGuild.id}`, { cause: error });
				}
			}

			for (const userId of todayBirthdayUserIds) {
				let member;
				try {
					member = await discordGuild.members.fetch(userId);
				} catch {
					continue;
				}

				if (birthdayRoleId && !member.roles.cache.has(birthdayRoleId)) {
					await member.roles.add(birthdayRoleId, "Happy Birthday!").catch((error) => {
						logger.error(`Failed to add birthday role to ${member.user.tag}`, { cause: error });
					});
				}

				if (birthdayChannelId) {
					try {
						const channel = await discordGuild.channels.fetch(birthdayChannelId);
						if (channel && channel.isTextBased() && "send" in channel) {
							const user = await client.getUser(member.id);
							const pictureBuffer = await generateRichPicture({
								type: RichPictureType.Birthday,
								data: {
									username: member.displayName,
									avatarUrl: user?.avatar("webp", 256, false) ?? member.user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
									avatarDecorationUrl: user?.avatarDecoration(false) ?? undefined,
									displayNameStyle: await user?.displayNameStyle()
								}
							});

							const attachment = new AttachmentBuilder(pictureBuffer, { name: "birthday.png" });
							await channel.send({
								content: `Everyone, let's wish a happy birthday to <@${member.id}>!`,
								files: [attachment]
							});

							logger.debug(`Sent birthday announcement for ${member.user.tag} in ${discordGuild.name}.`);
						}
					} catch (error) {
						logger.error(`Failed to send birthday announcement for ${member.user.tag} in ${discordGuild.name}`, { cause: error });
					}
				}
			}
		}

		logger.info("Daily birthday check complete.");
	}
};
