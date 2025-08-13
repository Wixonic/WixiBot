const { ComponentType, MessageFlags } = require("discord.js");

const fs = require("fs");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "View Ticket",
	id: "viewTicket",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, ticketId) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const viewer = interaction.member;
		const ticketPath = bot.settings.paths.ticket(interaction.guild.id, ticketId);

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

				await interaction.followUp(`Ticket ${ticketId} is now available at <#${channel.id}>.`);

				fs.writeFileSync(ticketPath, JSON.stringify(ticket));
			} catch (e) {
				logger.warn(`Failed to read ticket file: ${e}`);
				await interaction.followUp("An error occured while reading the ticket file.");
			}
		} else {
			logger.warn(`Ticket file not found: ${ticketId}`);
			await interaction.message.delete();
			await interaction.followUp("This ticket does not exist anymore.");
		}
	}
};

module.exports = component;