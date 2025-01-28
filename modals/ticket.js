const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "sendTicket",
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const member = await interaction.guild.members.fetch(interaction.member?.id);

		if (member) {
			const ticketSettings = settings?.guilds?.[interaction.guildId]?.ticket;

			if (ticketSettings?.active) {
				const channelId = ticketSettings?.queue;

				if (channelId) {
					const channel = await interaction.guild.channels.fetch(channelId);

					if (channel) {
						if (!fs.existsSync(config.cache.tickets)) fs.mkdirSync(config.cache.tickets, { recursive: true });
						const ticketId = `${interaction.createdTimestamp.toString(36)}T${fs.readdirSync(config.cache.tickets, { encoding: "utf-8" }).length.toString(36)}`;

						await channel.send({
							embeds: [
								new EmbedBuilder()
									.setAuthor({
										name: member.displayName,
										iconURL: member.displayAvatarURL({
											size: 256,
											extension: "png"
										})
									})
									.setTitle(interaction.fields.getTextInputValue("title"))
									.setDescription(interaction.fields.getTextInputValue("description"))
									.setColor(member.roles.highest.color)
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

						fs.writeFileSync(path.join(config.cache.tickets, `${ticketId}.json`), JSON.stringify({
							type: "WAITING",
							id: ticketId,
							title: interaction.fields.getTextInputValue("title"),
							description: interaction.fields.getTextInputValue("description"),
							author: {
								id: member.id,
								name: member.displayName,
								icon: member.displayAvatarURL({
									size: 256,
									extension: "png"
								})
							},
							color: member.roles.highest.color,
							createdAt: interaction.createdTimestamp
						}), "utf-8");

						await interaction.editReply({
							content: `Your ticket has been sent. This process may take a few hours or days.\nPlease do not reopen a ticket, as it will not make us answer faster.\n\nWhen your ticket is claimed by a staff member, you will be notified and a new channel will be created for you.\n-# Ticket ${ticketId}`,
							flags: MessageFlags.Ephemeral
						});
						interaction.log("Ticket sent");
					} else {
						interaction.log("Failed to fetch channel");
						await interaction.editReply({
							content: "This interaction is not available.",
							flags: MessageFlags.Ephemeral
						});
					}
				} else {
					interaction.log("Failed to find channel ID");
					await interaction.editReply({
						content: "This interaction is not available.",
						flags: MessageFlags.Ephemeral
					});
				}
			} else {
				interaction.log("Ticket Tool disabled");
				await interaction.editReply({
					content: "This interaction is not available.",
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			interaction.log("Failed to fetch member");
			await interaction.editReply({
				content: "This interaction is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}