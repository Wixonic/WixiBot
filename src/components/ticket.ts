import {
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	type MessageComponentInteraction,
	MessageFlags,
	PermissionFlagsBits
} from "discord.js";

import { client, type Component } from "../lib/client.ts";
import type { TicketData } from "../lib/guild.ts";
import type { Logger } from "../lib/logger.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";

export type TicketMessageData = Pick<TicketData, "interactions" | "id" | "reason"> & Partial<Pick<TicketData, "interactions" | "date" | "state">>;

export const ticketMessages = (interaction: MessageComponentInteraction, ticket: TicketMessageData) => {
	const reasons: Record<string, string> = {
		"server": `<@${ticket.interactions.createdBy}> has an issue on the server.`,
		"discord": `<@${ticket.interactions.createdBy}> has an issue on Discord in general.`,
		"command": `<@${ticket.interactions.createdBy}> needs help with a command.`,
		"application": `<@${ticket.interactions.createdBy}> has a question about ${interaction.client.user?.username} in general.`,
		"privacy": `<@${ticket.interactions.createdBy}> has a question about privacy.`,
		"bug": `<@${ticket.interactions.createdBy}> found a bug.`,
		"github": `<@${ticket.interactions.createdBy}> wants to contribute on GitHub.`,
		"contribute": `<@${ticket.interactions.createdBy}> wants to contribute.`
	};

	const ticketChannelMessageContent = new ContainerBuilder();
	const channelMessageContent = new ContainerBuilder();

	if (ticket.state === "Resolved") {
		ticketChannelMessageContent.setAccentColor(0x008800);
		channelMessageContent.setAccentColor(0x008800);
	} else if (ticket.state === "Closed") {
		ticketChannelMessageContent.setAccentColor(0xFF0000);
		channelMessageContent.setAccentColor(0xFF0000);
	}

	ticketChannelMessageContent.addMediaGalleryComponents((gallery) => gallery
		.addItems((item) => item.setURL(`attachment://ticket-${ticket.id}.png`))
	);

	ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`# Ticket\n\n${reasons[ticket.reason ?? ""] ?? `<@${ticket.interactions.createdBy}> opened a support ticket.`}`)
	);
	channelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`# Ticket\n\n${reasons[ticket.reason ?? ""] ?? `<@${ticket.interactions.createdBy}> opened a support ticket.`}`)
	);

	if (ticket.interactions.claimedBy) {
		ticketChannelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions.claimedBy}> has claimed this ticket.`)
		);

		channelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions.claimedBy}> has claimed this ticket.`)
		);
	}

	if (ticket.interactions.closedBy) {
		ticketChannelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions.closedBy}> has closed this ticket.`)
		);

		channelMessageContent.addTextDisplayComponents((component) => component
			.setContent(`<@${ticket.interactions.closedBy}> has closed this ticket.`)
		);
	} else {
		ticketChannelMessageContent.addActionRowComponents((component) => component
			.addComponents([
				new ButtonBuilder()
					.setCustomId(`ticket:resolve:${ticket.id}`)
					.setLabel("Mark as resolved")
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId(`ticket:close:${ticket.id}`)
					.setLabel("Close")
					.setStyle(ButtonStyle.Danger)
			])
		);
	}
	channelMessageContent.addActionRowComponents((component) => component
		.addComponents([
			new ButtonBuilder()
				.setCustomId(`ticket:view:${ticket.id}`)
				.setLabel("View")
				.setStyle(ButtonStyle.Secondary)
		])
	);

	if (ticket.interactions.viewedBy.length > 0) ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# This ticket has been viewed by: ${ticket.interactions.viewedBy.map((id) => `<@${id}>`).join(", ")}`)
	);

	ticketChannelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# Ticket ID: \`${ticket.id}\` - Created <t:${Math.floor(new Date(ticket?.date ?? new Date()).getTime() / 1000)}:F>`)
	);
	channelMessageContent.addTextDisplayComponents((component) => component
		.setContent(`-# Ticket ID: \`${ticket.id}\` - Created <t:${Math.floor(new Date(ticket?.date ?? new Date()).getTime() / 1000)}:F>`)
	);

	return [
		ticketChannelMessageContent,
		channelMessageContent
	];
};

export const createTicketHeaderAttachment = async (interaction: MessageComponentInteraction, ticket: TicketMessageData) => {
	const ticketCreatorUser = await client.getUser(ticket.interactions.createdBy);
	const creatorMember = interaction.guild ? await interaction.guild.members.fetch(ticket.interactions.createdBy).catch(() => null) : null;
	const creatorUser = creatorMember?.user ?? (await interaction.client.users.fetch(ticket.interactions.createdBy).catch(() => null));
	const creatorDisplayName = creatorMember?.displayName ?? creatorUser?.globalName ?? creatorUser?.username ?? ticket.interactions.createdBy;

	const claimedMember = (ticket.interactions.claimedBy && interaction.guild) ? await interaction.guild.members.fetch(ticket.interactions.claimedBy).catch(() => null) : null;
	const claimedUser = claimedMember?.user ?? (ticket.interactions.claimedBy ? await interaction.client.users.fetch(ticket.interactions.claimedBy).catch(() => null) : null);
	const claimedDisplayName = claimedMember?.displayName ?? claimedUser?.globalName ?? claimedUser?.username;

	const buffer = await generateRichPicture({
		type: RichPictureType.TicketHeader,
		data: {
			ticketId: ticket.id,
			creatorUsername: creatorDisplayName,
			creatorAvatarUrl: ticketCreatorUser?.avatar("webp", 256, false) ?? (creatorUser ? creatorUser.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }) : undefined),
			creatorAvatarDecorationUrl: ticketCreatorUser?.avatarDecoration(false) ?? undefined,
			creatorDisplayNameStyle: await ticketCreatorUser?.displayNameStyle(),
			reason: ticket.reason || "General support ticket",
			state: ticket.state || "Waiting",
			claimedByUsername: claimedDisplayName,
			createdAtFormatted: new Date(ticket.date || Date.now()).toLocaleDateString()
		}
	});

	return new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}.png` });
};

const updateTicketMessages = async (logger: Logger, interaction: MessageComponentInteraction, ticket: TicketData, logChannelId: string): Promise<void> => {
	if (!interaction.guild) return;

	const [ticketMessageContent, channelMessageContent] = ticketMessages(interaction, ticket);
	const attachment = await createTicketHeaderAttachment(interaction, ticket);

	const ticketChannel = await interaction.guild.channels.fetch(ticket.channel).catch(() => null);
	if (ticketChannel?.isTextBased()) {
		try {
			const ticketMessage = await ticketChannel.messages.fetch(ticket.messages.channel).catch(() => null);
			if (ticketMessage) {
				await ticketMessage.edit({
					files: [attachment],
					components: [ticketMessageContent],
					flags: MessageFlags.IsComponentsV2
				});
			}
		} catch (error) {
			logger.warn("Failed to update ticket channel message", {
				cause: error
			});
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
			logger.warn("Failed to update log channel message", {
				cause: error
			});
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

				const ticketData: TicketMessageData = {
					id,
					reason: interaction.values[0],
					interactions: {
						createdBy: interaction.user.id,
						viewedBy: []
					}
				};

				const [ticketChannelMessageContent, channelMessageContent] = ticketMessages(interaction, ticketData);
				const attachment = await createTicketHeaderAttachment(interaction, ticketData);

				const ticketChannelMessage = await ticketChannel.send({
					files: [attachment],
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

				const ticket = await guild.createTicket(id, ticketChannel.id, interaction.user.id, {
					channel: ticketChannelMessage.id,
					guild: channelMessage.id
				}, interaction.values[0]);

				await interaction.editReply({
					content: `Your ticket has been created in <#${ticket.channel}>.`
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

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (!guild) {
					await interaction.deleteReply();
					throw new Error("Guild not found");
				}

				const ticket = await guild.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				ticket.interactions.claimedBy = interaction.user.id;
				ticket.state = "Claimed";
				await guild.saveTicket(ticket);

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

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (!guild) {
					await interaction.deleteReply();
					throw new Error("Guild not found");
				}

				const ticket = await guild.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({ content: "Ticket not found." });
					return;
				}

				const alreadyViewed = ticket.interactions.viewedBy.includes(interaction.user.id);
				if (!alreadyViewed) {
					ticket.interactions.viewedBy.push(interaction.user.id);
					await guild.saveTicket(ticket);

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

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (!guild) {
					await interaction.deleteReply();
					throw new Error("Guild not found");
				}

				const ticket = await guild.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				const isCreator = interaction.user.id === ticket.interactions.createdBy;
				const isModerator = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));

				if (!isCreator && !isModerator) {
					await interaction.editReply("You do not have permission to close this ticket.");
					return;
				}

				ticket.interactions.closedBy = interaction.user.id;
				ticket.state = "Closed";
				await guild.saveTicket(ticket);

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

				const guild = await client.getGuild(interaction.guildId ?? "-1");
				if (!guild) {
					await interaction.deleteReply();
					throw new Error("Guild not found");
				}

				const ticket = await guild.loadTicket(ticketId);
				if (!ticket) {
					await interaction.editReply({
						content: "Ticket not found."
					});
					return;
				}

				const isCreatorResolve = interaction.user.id === ticket.interactions.createdBy;
				const isModeratorResolve = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));

				if (!isCreatorResolve && !isModeratorResolve) {
					await interaction.editReply("You do not have permission to resolve this ticket.");
					return;
				}

				ticket.interactions.closedBy = interaction.user.id;
				ticket.state = "Resolved";
				await guild.saveTicket(ticket);

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