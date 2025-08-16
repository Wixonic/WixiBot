const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, MessageFlags } = require("discord.js");

const fs = require("fs");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Claim Ticket",
	id: "claimTicket",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, ticketId) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const ticketPath = bot.settings.paths.ticket(interaction.guild.id, ticketId);

		if (fs.existsSync(ticketPath)) {
			try {
				const initialTicket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));
				if (initialTicket.type == "WAITING") {
					const ticket = {
						...initialTicket,
						claimedBy: {
							id: interaction.member.id,
							name: interaction.member.user.displayName
						},
						claimedAt: Date.now(),
						viewers: []
					};
					ticket.type = "CLAIMED";

					const channel = await interaction.guild.channels.create({
						name: `ticket-${ticketId}`,
						parent: bot.settings.application.commands.tickets.category,
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

					fs.writeFileSync(ticketPath, JSON.stringify(ticket), "utf-8");

					await interaction.followUp(`Ticket ${ticketId} is now claimed at <#${channel.id}>.`);
				}
			} catch (e) {
				logger.warn(`Failed to read ticket file: ${e}`);
				await interaction.followUp("An error occured while reading the ticket file.");
			}
		} else {
			logger.warn("Ticket file not found.");
			await interaction.message.delete();
			await interaction.followUp("This ticket does not exist anymore.");
		}
	}
};

module.exports = component;