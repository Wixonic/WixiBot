import { Events, type Message } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { moderationCache } from "../lib/moderation/cache.ts";
import { analyzeMessage } from "../lib/moderation/service.ts";

export const event = {
	type: Events.MessageCreate,
	once: false,

	async execute(_logger: Logger, message: Message) {
		if (message.author.bot || !message.guildId) return;

		const guild = await client.getGuild(message.guildId);
		if (guild) {
			const channelId = message.channelId;
			const categoryId = message.channel.isTextBased() && "parentId" in message.channel ? message.channel.parentId : null;

			const ignoredChannels = guild.settings.moderation.ignoredChannels || [];
			const lowRiskChannels = guild.settings.moderation.lowRiskChannels || [];

			const isIgnored = ignoredChannels.includes(channelId) || (categoryId && ignoredChannels.includes(categoryId));
			const isLowRisk = lowRiskChannels.includes(channelId) || (categoryId && lowRiskChannels.includes(categoryId));

			if (!isIgnored) {
				(async () => {
					try {
						const result = await analyzeMessage(message);

						if (result.action !== "safe") {
							const reason = `[AI Moderation - ${result.action}] ${result.reason || "No reason provided."}`;
							const botId = client.discord?.user?.id;
							const botMember = botId && message.guild ? await message.guild.members.fetch(botId).catch(() => null) : null;

							const diagnostic = {
								"urgent_problem": "Flagged as **urgent problem**.",
								"strictly_forbidden": "Flagged as strictly forbidden content.",
								"strictly_illegal_inappropriate": "Flagged as strictly illegal or highly inappropriate content.",
								"probably_inappropriate": "Flagged as probably inappropriate content."
							}[result.action];

							if (isLowRisk) {
								if (result.action === "urgent_problem") {
									await message.delete().catch(() => { });
									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been timed out for 24 hours.");
								} else if (result.action === "strictly_forbidden") {
									const warningMsg = await message.reply({
										content: `# Hey-oh!\nYour message is not allowed here!\nPlease do not do that again.\n-# *Reason: ${result.reason || "No reason provided."}*\n-# This warning message will be deleted in a few seconds.`
									}).catch(() => null);

									if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => { }), 30000);

									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been informed.");
								} else if (result.action === "strictly_illegal_inappropriate") {
									const warningMsg = await message.reply({
										content: `# Hey-oh!\nYour message is not allowed here!\nPlease do not do that again.\n-# *Reason: ${result.reason || "No reason provided."}*\n-# This warning message will be deleted in a few seconds.`
									}).catch(() => null);

									if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => { }), 30000);

									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been informed.");
								}
							} else {
								if (result.action === "urgent_problem") {
									if (message.member) await message.member.timeout(1000 * 60 * 60 * 24, reason).catch(() => { }); // 24 hours
									await message.delete().catch(() => { });
									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been timed out for 24 hours.");
								} else if (result.action === "strictly_forbidden") {
									await message.delete().catch(() => { });
									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe message has been deleted.");
								} else if (result.action === "strictly_illegal_inappropriate") {
									if (message.member) await guild.warn(message.member, botMember || null, reason);
									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been warned.");
								} else if (result.action === "probably_inappropriate") {
									const warningMsg = await message.reply({
										content: `# Hey-oh!\nYour message has been flagged as potentially inappropriate.\nPlease keep in mind.\n-# *Reason: ${result.reason || "No reason provided."}*\n-# This warning message will be deleted in a few seconds.`
									}).catch(() => null);

									if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => { }), 30000);

									await guild.reportMessage(message, botMember || null, reason + diagnostic + "\nThe user has been informed.");
								}
							}
						}
					} catch (error) {
						_logger.error("Failed to execute AI moderation", { cause: error });
					}
				})();
			}

			if (!isIgnored) moderationCache.addMessage(message.channelId, message.author.username, message.author.id, message.content);
		}

		const user = await client.getUser(message.author.id);
		if (user && user.settings.activity.record) {
			user.addActivity(message.guildId, "message");

			for (const mentionedDiscordUser of message.mentions.users.values()) {
				if (!mentionedDiscordUser.bot && mentionedDiscordUser.id !== message.author.id) {
					const mentionedUser = await client.getUser(mentionedDiscordUser.id);
					if (mentionedUser && mentionedUser.settings.activity.record) mentionedUser.addActivity(message.guildId, "mention");
				}
			}
		}
	}
};