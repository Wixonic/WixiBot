const { ActionRowBuilder, EmbedBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "sendTicket",
	execute: async (interaction) => {
		const member = await interaction.guild.members.fetch(interaction.member.id);

		if (member) {
			const channelId = settings.guilds[interaction.guild.id]?.ticket?.queue;

			if (channelId) {
				const channel = await interaction.guild.channels.fetch(channelId);

				if (channel) {
					await channel.send({
						embeds: [
							new EmbedBuilder()
								.setAuthor({
									name: member.displayName,
									iconURL: member.displayAvatarURL()
								})
								.setColor(member.roles.highest.color)
								.setDescription(interaction.fields.getTextInputValue("description"))
								.setFooter({
									text: "Sent with Wixi's Ticket Tool"
								})
								.setTimestamp(interaction.createdTimestamp)
								.setTitle(interaction.fields.getTextInputValue("title"))
						]
					});

					await interaction.reply({
						content: "Your ticket has been sent. This process may take a few hours or days.\nPlease do not reopen a ticket, as it will not make us answer faster.\n\nYou'll recieve an answer in DMs. Please check if you allowed users to send you DMs from this server.",
						ephemeral: true
					});
					interaction.log("Ticket sent");
				} else {
					interaction.log("Failed to fetch channel");
					await interaction.reply({
						content: "This interaction is not available.",
						ephemeral: true
					});
				}
			} else {
				interaction.log("Failed to find channel ID");
				await interaction.reply({
					content: "This interaction is not available.",
					ephemeral: true
				});
			}
		} else {
			interaction.log("Failed to fetch member");
			await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
			});
		}
	}
}