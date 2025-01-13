const { PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "viewTicket",
	args: 1,
	execute: async (interaction, args) => {
		const viewer = interaction.member;
		const ticketId = args[0];

		const ticketPath = path.join(config.cache.tickets, ticketId + ".json");

		if (fs.existsSync(ticketPath)) {
			try {
				const initialTicket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));
				const ticket = {
					...initialTicket
				};
				ticket.viewers.push({
					id: viewer.id,
					name: viewer.user.displayName
				});

				const channel = await interaction.guild.channels.fetch(ticket.channel);

				await channel.permissionOverwrites.edit({
					id: viewer.id,
					allow: [PermissionFlagsBits.ViewChannel]
				});

				await interaction.reply({
					content: `Ticket ${ticketId} is now available at <#${channel.id}>.`,
					ephemeral: true
				});

				fs.writeFileSync(ticketPath, JSON.stringify(ticket));
			} catch (e) {
				interaction.log(`Failed to read ticket file: ${e}`);
				await interaction.reply({
					content: "An error occured while reading the ticket file.",
					ephemeral: true
				});
			}
		} else {
			interaction.log(`Ticket file not found: ${ticketId}`);
			await interaction.message.delete();
			await interaction.reply({
				content: "This ticket does not exist anymore.",
				ephemeral: true
			});
		}
	}
}