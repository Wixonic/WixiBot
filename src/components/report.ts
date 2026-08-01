import {
	type MessageComponentInteraction,
	MessageFlags
} from "discord.js";

import { client, type Component } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const component = {
	customId: "report",
	async execute(logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		if (!interaction.guild) {
			await interaction.deleteReply();
			throw new Error("This component can only be used in a guild.");
		}

		const [targetType, action, targetId] = options;
		if (!targetType || !action || !targetId) {
			await interaction.followUp("Invalid report action arguments.");
			return;
		}

		const guild = await client.getGuild(interaction.guild.id);
		if (!guild) {
			await interaction.followUp("Guild not found.");
			return;
		}

		switch (action) {
			case "close": {
				await interaction.followUp(`Report closed by <@${interaction.user.id}>.`);
				if (interaction.message && "edit" in interaction.message) {
					await interaction.message.edit({ components: [] }).catch(() => null);
				}
				break;
			}

			case "delete": {
				if (targetType === "message") {
					try {
						const channel = interaction.channel;
						if (channel && channel.isTextBased()) {
							const msg = await channel.messages.fetch(targetId).catch(() => null);
							if (msg && msg.deletable) {
								await msg.delete();
								await interaction.followUp("Target message deleted successfully.");
							} else {
								await interaction.followUp("Could not delete message (already deleted or missing permissions).");
							}
						}
					} catch (error) {
						logger.error("Failed to delete reported message", { cause: error });
						await interaction.followUp("Failed to delete message.");
					}
				}
				break;
			}

			case "warn": {
				try {
					let member = await interaction.guild.members.fetch(targetId).catch(() => null);
					if (!member && targetType === "message" && interaction.channel && interaction.channel.isTextBased()) {
						const msg = await interaction.channel.messages.fetch(targetId).catch(() => null);
						if (msg) member = await interaction.guild.members.fetch(msg.author.id).catch(() => null);
					}

					if (!member) {
						await interaction.followUp("Member not found in guild.");
						return;
					}

					await guild.warn(member, interaction.member, "Moderation report action");
					await interaction.followUp(`User <@${member.id}> has been warned.`);
				} catch (error) {
					logger.error("Failed to warn member from report card", { cause: error });
					await interaction.followUp("Failed to warn member.");
				}
				break;
			}

			case "ban": {
				try {
					let member = await interaction.guild.members.fetch(targetId).catch(() => null);
					if (!member && targetType === "message" && interaction.channel && interaction.channel.isTextBased()) {
						const msg = await interaction.channel.messages.fetch(targetId).catch(() => null);
						if (msg) member = await interaction.guild.members.fetch(msg.author.id).catch(() => null);
					}

					if (!member) {
						await interaction.followUp("Member not found in guild.");
						return;
					}

					if (!member.bannable) {
						await interaction.followUp("I do not have permissions to ban this member.");
						return;
					}

					await member.ban({ reason: "Moderation report action" });
					await interaction.followUp(`User **${member.user.tag}** has been banned.`);
				} catch (error) {
					logger.error("Failed to ban member from report card", { cause: error });
					await interaction.followUp("Failed to ban member.");
				}
				break;
			}

			case "timeout": {
				try {
					const member = await interaction.guild.members.fetch(targetId).catch(() => null);
					if (!member) {
						await interaction.followUp("Member not found in guild.");
						return;
					}

					if (!member.moderatable) {
						await interaction.followUp("I do not have permissions to timeout this member.");
						return;
					}

					await member.timeout(60 * 60 * 1000, "Moderation report action (1 hour)");
					await interaction.followUp(`User **${member.user.tag}** has been timed out for 1 hour.`);
				} catch (error) {
					logger.error("Failed to timeout member from report card", { cause: error });
					await interaction.followUp("Failed to timeout member.");
				}
				break;
			}

			case "reply": {
				await interaction.followUp(`To reply to this user/message, send a direct message or open a ticket.`);
				break;
			}

			default: {
				await interaction.followUp("Unknown report action.");
				break;
			}
		}
	}
} satisfies Component;