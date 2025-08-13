const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");

const fs = require("fs");

/**
 * @type {import("../types").ModalInfo}
 */
const modal = {
	name: "Send Ticket",
	id: "sendTicket",
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const channel = await interaction.guild.channels.fetch(bot.settings.application.moderationChannel);

		if (channel) {
			const ticketsPath = bot.settings.paths.tickets(interaction.guild.id);
			if (!fs.existsSync(ticketsPath)) fs.mkdirSync(ticketsPath, { recursive: true });
			const ticketId = `t${interaction.createdTimestamp.toString(36)}T${fs.readdirSync(ticketsPath, { encoding: "utf-8" }).length.toString(36)}`;

			await channel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: interaction.member.user.displayName ?? interaction.member.user.username,
							iconURL: interaction.member.user.displayAvatarURL({
								size: 256,
								extension: "png"
							})
						})
						.setTitle(interaction.fields.getTextInputValue("title"))
						.setDescription(interaction.fields.getTextInputValue("description"))
						.setColor(interaction.member.roles.highest.color)
						.setTimestamp(interaction.createdTimestamp)
						.setFooter({
							text: `Ticket ${ticketId}`
						})
				],
				components: [
					new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder()
								.setCustomId(`claimTicket_${ticketId}`)
								.setLabel("Claim Ticket")
								.setStyle(ButtonStyle.Primary)
						)
				]
			});

			fs.writeFileSync(bot.settings.paths.ticket(interaction.guild.id, ticketId), JSON.stringify({
				type: "WAITING",
				id: ticketId,
				title: interaction.fields.getTextInputValue("title"),
				description: interaction.fields.getTextInputValue("description"),
				author: {
					id: interaction.member.id,
					name: interaction.member.user.displayName ?? interaction.member.user.username,
					icon: interaction.member.user.displayAvatarURL({
						size: 256,
						extension: "png"
					})
				},
				color: interaction.member.roles.highest.color,
				createdAt: interaction.createdTimestamp
			}), "utf-8");

			await interaction.followUp(`Your ticket has been sent. This process may take a few hours or days.\nPlease do not reopen a ticket, as it will not make us answer faster.\n\nWhen your ticket is claimed by a staff member, you will be notified and a new channel will be created for you.\n-# Ticket ${ticketId}`);
			logger.debug("Ticket sent");
		} else {
			logger.debug("Failed to fetch channel");
			await interaction.followUp("This interaction is not available.");
		}
	}
};

module.exports = modal;