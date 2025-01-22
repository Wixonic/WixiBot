const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "claimTicket",
	args: 1,
	execute: async (interaction, args) => {
		const guildSettings = settings?.guilds?.[interaction.guildId];
		const ticketSettings = guildSettings?.ticket;

		const claimer = interaction.member;
		const ticketId = args[0];

		const ticketPath = path.join(config.cache.tickets, ticketId + ".json");

		if (fs.existsSync(ticketPath)) {
			try {
				const initialTicket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));
				const ticket = {
					...initialTicket,
					claimedBy: {
						id: claimer.id,
						name: claimer.user.displayName
					},
					claimedAt: Date.now(),
					viewers: []
				};
				ticket.type = "CLAIMED";

				const channel = await interaction.guild.channels.create({
					name: `ticket-${ticketId}`,
					parent: ticketSettings?.category,
					type: ChannelType.GuildText
				});
				ticket.channel = channel.id;

				await channel.permissionOverwrites.edit(ticket.author.id, {
					ViewChannel: true,
					SendMessages: true
				});

				await channel.permissionOverwrites.edit(ticket.claimedBy.id, {
					ViewChannel: true,
					SendMessages: true
				});

				await channel.send({
					content: `<@${ticket.author.id}>, your ticket has been claimed by <@${ticket.claimedBy.id}>.`,
					embeds: [
						new EmbedBuilder()
							.setAuthor({
								name: ticket.author.name,
								iconURL: ticket.author.icon
							})
							.setTitle(ticket.title)
							.setDescription(ticket.description)
							.setColor(ticket.color)
							.setTimestamp(ticket.createdTimestamp)
							.setFooter({
								text: `Ticket ${ticketId}`
							})
					],
					components: [
						new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`closeTicket_${ticketId}`)
									.setLabel("Close Ticket")
									.setStyle(ButtonStyle.Danger)
							)
					]
				});

				await interaction.message.edit({
					content: `Ticket claimed by <@${ticket.claimedBy.id}>`,
					embeds: [
						new EmbedBuilder()
							.setAuthor({
								name: ticket.author.name,
								iconURL: ticket.author.icon
							})
							.setTitle(ticket.title)
							.setDescription(ticket.description)
							.setColor(ticket.color)
							.setTimestamp(ticket.createdTimestamp)
							.setFooter({
								text: `Ticket ${ticketId}`
							})
					],
					components: [
						new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setCustomId(`viewTicket_${ticketId}`)
									.setLabel("View Ticket")
									.setStyle(ButtonStyle.Secondary)
							)
					],
					flags: MessageFlags.SuppressNotifications
				});

				await interaction.reply({
					content: `Ticket ${ticketId} is now claimed at <#${channel.id}>.`,
					flags: MessageFlags.Ephemeral
				});

				fs.writeFileSync(ticketPath, JSON.stringify(ticket), "utf-8");
			} catch (e) {
				interaction.log(`Failed to read ticket file: ${e}`);
				await interaction.reply({
					content: "An error occured while reading the ticket file.",
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			interaction.log(`Ticket file not found: ${ticketId}`);
			await interaction.message.delete();
			await interaction.reply({
				content: "This ticket does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}