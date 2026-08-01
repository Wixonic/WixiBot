import {
	ChannelType,
	ContainerBuilder,
	type MessageComponentInteraction,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js";

import { client, type Component } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { createTicketHeaderAttachment, ticketMessages, type TicketMessageData } from "./ticket.ts";

export const component = {
	customId: "report",
	async execute(logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		if (!interaction.guild) {
			await interaction.deleteReply();
			throw new Error("This component can only be used in a guild.");
		}

		const [targetType, action, targetId, extraId] = options;
		if (!targetType || !action || !targetId) {
			await interaction.followUp("Invalid report action arguments.");
			return;
		}

		const guild = await client.getGuild(interaction.guild.id);
		if (!guild) {
			await interaction.followUp("Guild not found.");
			return;
		}

		const resolveTargetUser = async () => {
			let user = await interaction.client.users.fetch(targetId).catch(() => null);
			if (!user && extraId) user = await interaction.client.users.fetch(extraId).catch(() => null);
			if (!user && interaction.channel && interaction.channel.isTextBased()) {
				const message = await interaction.channel.messages.fetch(targetId).catch(() => null);
				if (message) user = message.author;
			}
			return user;
		};

		switch (action) {
			case "close": {
				await interaction.followUp(`Report closed by <@${interaction.user.id}>.`);
				if (interaction.message && "edit" in interaction.message) {
					await interaction.message.edit({
						components: [
							new ContainerBuilder()
								.addTextDisplayComponents((component) => component
									.setContent(`-# Closed by <@${interaction.user.id}>`)
								)
						],
						flags: MessageFlags.IsComponentsV2
					}).catch(() => null);
				}
				break;
			}

			case "delete": {
				if (targetType === "message") {
					try {
						const channelId = extraId ? targetId : interaction.channelId;
						const messageId = extraId ? extraId : targetId;
						const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
						if (channel && channel.isTextBased()) {
							const msg = await channel.messages.fetch(messageId).catch(() => null);
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
					const user = await resolveTargetUser();
					const member = user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

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
					const user = await resolveTargetUser();
					const member = user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

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
					const user = await resolveTargetUser();
					const member = user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;

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
				try {
					const targetUser = await resolveTargetUser();

					if (!targetUser) {
						await interaction.followUp("Target user not found.");
						return;
					}

					const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase();
					const ticketChannel = await interaction.guild.channels.create({
						name: `mod-ticket-${ticketId}`,
						type: ChannelType.GuildText,
						parent: guild.settings.tickets.category,
						permissionOverwrites: [
							{
								id: interaction.user.id,
								allow: [
									PermissionFlagsBits.ViewChannel,
									PermissionFlagsBits.SendMessages,
									PermissionFlagsBits.ReadMessageHistory
								]
							},
							{
								id: targetUser.id,
								allow: [
									PermissionFlagsBits.ViewChannel,
									PermissionFlagsBits.SendMessages,
									PermissionFlagsBits.ReadMessageHistory
								]
							},
							{
								id: interaction.guild.roles.everyone,
								deny: [
									PermissionFlagsBits.ViewChannel
								]
							}
						]
					});

					const ticketData: TicketMessageData = {
						id: ticketId,
						reason: `Moderation report reply for @${targetUser.username}`,
						state: "Claimed",
						interactions: {
							createdBy: interaction.user.id,
							claimedBy: interaction.user.id,
							viewedBy: [targetUser.id]
						}
					};

					const [ticketChannelMessageContent, channelMessageContent] = ticketMessages(interaction, ticketData);
					const attachment = await createTicketHeaderAttachment(interaction, ticketData);

					const ticketMessage = await ticketChannel.send({
						files: [attachment],
						components: [ticketChannelMessageContent],
						flags: MessageFlags.IsComponentsV2
					});

					let logChannelMessageId = ticketMessage.id;
					if (guild.settings.tickets.channel) {
						const logChannel = await interaction.guild.channels.fetch(guild.settings.tickets.channel).catch(() => null);
						if (logChannel && logChannel.isTextBased()) {
							const logMessage = await logChannel.send({
								components: [channelMessageContent],
								flags: MessageFlags.IsComponentsV2
							}).catch(() => null);
							if (logMessage) logChannelMessageId = logMessage.id;
						}
					}

					await guild.createTicket(ticketId, ticketChannel.id, interaction.user.id, {
						channel: ticketMessage.id,
						guild: logChannelMessageId
					}, `Moderation report reply for ${targetUser.username}`, "Claimed", interaction.user.id);

					await interaction.followUp(`Moderation ticket created in <#${ticketChannel.id}>.`);
				} catch (error) {
					logger.error("Failed to create moderation reply ticket", { cause: error });
					await interaction.followUp("Failed to create moderation ticket.");
				}
				break;
			}

			default: {
				await interaction.followUp("Unknown report action.");
				break;
			}
		}
	}
} satisfies Component;