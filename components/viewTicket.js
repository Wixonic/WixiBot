const { MessageFlags } = require("discord.js");
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
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

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

				await channel.permissionOverwrites.edit(viewer.id, {
					ViewChannel: true
				});

				await interaction.editReply({
					content: `Ticket ${ticketId} is now available at <#${channel.id}>.`,
					flags: MessageFlags.Ephemeral
				});

				fs.writeFileSync(ticketPath, JSON.stringify(ticket));
			} catch (e) {
				interaction.log(`Failed to read ticket file: ${e}`);
				await interaction.editReply({
					content: "An error occured while reading the ticket file.",
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			interaction.log(`Ticket file not found: ${ticketId}`);
			await interaction.message.delete();
			await interaction.editReply({
				content: "This ticket does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}