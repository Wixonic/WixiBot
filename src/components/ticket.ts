import {
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	type MessageComponentInteraction,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js";

import { client, type Component } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import type { TicketData } from "../lib/user.ts";

type TicketMessageData = Pick<TicketData, "id" | "reason"> & Partial<Pick<TicketData, "interactions" | "date">>;

const ticketMessages = (interaction: MessageComponentInteraction, ticket: TicketMessageData) => {
	const reasons: Record<string, string> = {
		"server": `<@${interaction.user.id}> has an issue on the server.`,
		"discord": `<@${interaction.user.id}> has an issue on Discord in general.`,
		"command": `<@${interaction.user.id}> needs help with a command.`,
		"application": `<@${interaction.user.id}> has a question about ${interaction.client.user?.username} in general.`,
		"privacy": `<@${interaction.user.id}> has a question about privacy.`,
		"bug": `<@${interaction.user.id}> found a bug.`,
		"github": `<@${interaction.user.id}> wants to contribute on GitHub.`,
		"contribute": `<@${interaction.user.id}> wants to contribute.`
	};

	const ticketChannelMessageContent = new ContainerBuilder();
	const channelMessageContent = new ContainerBuilder();

	ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`# Ticket\n\n${reasons[ticket.reason ?? ""] ?? `<@${interaction.user.id}> opened a support ticket.`}`)
	);
	channelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`# Ticket\n\n${reasons[ticket.reason ?? ""] ?? `<@${interaction.user.id}> opened a support ticket.`}`)
	);

	if (ticket.interactions?.claimedBy) {
		ticketChannelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions?.claimedBy}> has claimed this ticket.`)
		);

		channelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions?.claimedBy}> has claimed this ticket.`)
		);
	}

	if (ticket.interactions?.closedBy) {
		ticketChannelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`< @${ticket.interactions?.closedBy}> has closed this ticket.`)
		);

		channelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`< @${ticket.interactions?.closedBy}> has closed this ticket.`)
		);
	}

	ticketChannelMessageContent.addActionRowComponents((component) => component
		.addComponents([
			new ButtonBuilder()
				.setCustomId(`ticket: resolve:${ticket.id} `)
				.setLabel("Mark as resolved")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`ticket: close:${ticket.id} `)
				.setLabel("Close")
				.setStyle(ButtonStyle.Danger)
		])
	);
	channelMessageContent.addActionRowComponents((component) => component
		.addComponents([
			new ButtonBuilder()
				.setCustomId(`ticket:view:${ticket.id}`)
				.setLabel("View")
				.setStyle(ButtonStyle.Secondary)
		])
	);

	const viewedBy = ticket.interactions?.viewedBy ?? [];
	if (viewedBy.length > 0) ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# This ticket has been viewed by: ${viewedBy.map((id) => `<@${id}>`).join(", ")}`)
	);

	ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# Ticket ID: ${ticket.id} - Created at <t:${Math.floor(new Date(ticket?.date ?? new Date()).getTime() / 1000)}:F>`)
	);
	channelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# Ticket ID: ${ticket.id} - Created at <t:${Math.floor(new Date(ticket?.date ?? new Date()).getTime() / 1000)}:F>`)
	);

	return [
		ticketChannelMessageContent,
		channelMessageContent
	];
};

const updateTicketMessages = async (logger: Logger, interaction: MessageComponentInteraction, ticket: TicketData, logChannelId: string): Promise<void> => {
	if (!interaction.guild) return;

	const [ticketMessageContent, channelMessageContent] = ticketMessages(interaction, ticket);

	const ticketChannel = await interaction.guild.channels.fetch(ticket.channel).catch(() => null);
	if (ticketChannel?.isTextBased()) {
		try {
			const ticketMessage = await ticketChannel.messages.fetch(ticket.messages.channel).catch(() => null);
			if (ticketMessage) {
				await ticketMessage.edit({
					components: [ticketMessageContent],
					flags: MessageFlags.IsComponentsV2
				});
			}
		} catch (error) {
			logger.warn("Failed to update ticket channel message", { cause: error });
		}
	}

	const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
	if (logChannel?.isTextBased()) {
		try {
			const logMessage = await logChannel.messages.fetch(ticket.messages.guild).catch(() => null);
			if (logMessage) {
				await logMessage.edit({
					components: [channelMessageContent],
					flags: MessageFlags.IsComponentsV2
				});
			}
		} catch (error) {
			logger.warn("Failed to update log channel message", { cause: error });
		}
	}
};

export const component = {
	customId: "ticket",
	async execute(logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		if (!interaction.guild) {
			await interaction.deleteReply();
			throw new Error("This component can only be used in a guild.");
		}

		switch (options[0]) {
			case "reason": {
				if (!interaction.isStringSelectMenu()) {
					await interaction.deleteReply();
					throw new Error("Expected a string select menu interaction");
				}

				if (interaction.values[0] === "reset") {
					await interaction.deleteReply();
					return;
				}

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (!guild) {
					await interaction.deleteReply();
					throw new Error("Guild not found");
				}

				const id = Math.random().toString(36).substring(2, 8).toUpperCase();

				const channel = await interaction.guild.channels.fetch(guild.settings.tickets.channel ?? "-1");
				if (!channel || !channel.isTextBased()) {
					await interaction.deleteReply();
					throw new Error("Tickets channel not found or is not text-based");
				}

				const ticketChannel = await interaction.guild.channels.create({
					name: `ticket - ${id} `,
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
							id: interaction.guild.roles.everyone,
							deny: [
								PermissionFlagsBits.ViewChannel
							]
						}
					]
				});

				const [ticketChannelMessageContent, channelMessageContent] = ticketMessages(interaction, { id, reason: interaction.values[0] });

				const ticketChannelMessage = await ticketChannel.send({
					components: [
						ticketChannelMessageContent
					],
					flags: MessageFlags.IsComponentsV2
				});

				const channelMessage = await channel.send({
					components: [
						channelMessageContent
					],
					flags: MessageFlags.IsComponentsV2
				});

				const user = await client.getUser(interaction.user.id);
				if (!user) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				const ticket = await user.createTicket(id, ticketChannel.id, {
					channel: ticketChannelMessage.id,
					guild: channelMessage.id
				}, interaction.values[0]);

				await interaction.editReply({
					content: `Your ticket has been created in <#${ticket.channel} >.`
				});
				break;
			}

			case "claim": {
				if (!interaction.isButton()) {
					await interaction.deleteReply();
					throw new Error("Expected a button interaction");
				}

				const ticketId = options[1];
				if (!ticketId) {
					await interaction.deleteReply();
					throw new Error("Ticket ID not provided");
				}

				const user = await client.getUser(interaction.user.id);
				if (!user) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				const ticket = await user.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				ticket.interactions.claimedBy = interaction.user.id;
				ticket.state = "Claimed";
				await user.saveTicket(ticket);

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (guild) await updateTicketMessages(logger, interaction, ticket, guild.settings.tickets.channel ?? "-1");

				await interaction.deleteReply();
				break;
			}

			case "view": {
				if (!interaction.isButton()) {
					await interaction.deleteReply();
					throw new Error("Expected a button interaction");
				}

				const ticketId = options[1];
				if (!ticketId) {
					await interaction.deleteReply();
					throw new Error("Ticket ID not provided");
				}

				const user = await client.getUser(interaction.user.id);
				if (!user) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				const ticket = await user.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({ content: "Ticket not found." });
					return;
				}

				const alreadyViewed = ticket.interactions.viewedBy.includes(interaction.user.id);
				if (!alreadyViewed) {
					ticket.interactions.viewedBy.push(interaction.user.id);
					await user.saveTicket(ticket);

					const channel = await interaction.guild.channels.fetch(interaction.channelId).catch(() => null);
					if (channel?.isTextBased() && "permissionOverwrites" in channel) {
						try {
							await channel.permissionOverwrites.create(interaction.user.id, {
								ViewChannel: true,
								ReadMessageHistory: true
							});
						} catch (error) {
							logger.warn("Failed to grant ticket access", { cause: error });
						}
					}
				}

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (guild) await updateTicketMessages(logger, interaction, ticket, guild.settings.tickets.channel ?? "-1");

				await interaction.deleteReply();
				break;
			}

			case "close": {
				if (!interaction.isButton()) {
					await interaction.deleteReply();
					throw new Error("Expected a button interaction");
				}

				const ticketId = options[1];
				if (!ticketId) {
					await interaction.deleteReply();
					throw new Error("Ticket ID not provided");
				}

				const user = await client.getUser(interaction.user.id);
				if (!user) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				const ticket = await user.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				ticket.interactions.closedBy = interaction.user.id;
				ticket.state = "Closed";
				await user.saveTicket(ticket);

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (guild) await updateTicketMessages(logger, interaction, ticket, guild.settings.tickets.channel ?? "-1");

				await interaction.deleteReply();
				break;
			}

			case "resolve": {
				if (!interaction.isButton()) {
					await interaction.deleteReply();
					throw new Error("Expected a button interaction");
				}

				const ticketId = options[1];
				if (!ticketId) {
					await interaction.deleteReply();
					throw new Error("Ticket ID not provided");
				}

				const user = await client.getUser(interaction.user.id);
				if (!user) {
					await interaction.deleteReply();
					throw new Error("User not found");
				}

				const ticket = await user.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				ticket.interactions.closedBy = interaction.user.id;
				ticket.state = "Resolved";
				await user.saveTicket(ticket);

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (guild) await updateTicketMessages(logger, interaction, ticket, guild.settings.tickets.channel ?? "-1");

				await interaction.deleteReply();
				break;
			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown ticket action");
			}
		}
	}
} satisfies Component;