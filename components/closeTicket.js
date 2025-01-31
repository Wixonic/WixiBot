const { AttachmentBuilder, MessageFlags } = require("discord.js");

const fs = require("fs");
const path = require("path");

const { getUser } = require("../clients.js");

const config = require("../config.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "closeTicket",
	args: 1,
	execute: async (interaction, args) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const ticketId = args[0];

		const ticketPath = path.join(config.cache.tickets, ticketId + ".json");

		if (fs.existsSync(ticketPath)) {
			try {
				const initialTicket = JSON.parse(fs.readFileSync(ticketPath, "utf-8"));
				const ticket = {
					...initialTicket,
					closedBy: {
						name: interaction.member.user.displayName,
						id: interaction.member.id
					},
					closedAt: Date.now(),
					messages: []
				};
				ticket.type = "CLOSED";

				const channel = await interaction.guild.channels.fetch(ticket.channel);

				await channel.send({
					content: `This ticket has been closed by <@${ticket.closedBy.id}>.`
				});

				for (const userId of [ticket.author.id, ticket.claimedBy.id, ...ticket.viewers]) {
					if (userId) channel.permissionOverwrites.edit(userId, {
						SendMessages: false
					});
				}

				const viewerList = [];
				for (const viewer of ticket.viewers) viewerList.push(`${viewer.name} (${viewer.id})`);
				const transcript = [
					`Ticket by ${ticket.author.name} (${ticket.author.id})`,
					`Claimed by ${ticket.claimedBy.name} (${ticket.claimedBy.id})`,
					`Viewers: ${viewerList.join(", ")}`,
					`Created at: ${(new Date(ticket.createdAt)).toUTCString()}`,
					`Claimed at: ${(new Date(ticket.claimedAt)).toUTCString()}`,
					`Closed at: ${(new Date(ticket.closedAt)).toUTCString()}`,
					"-------------------------"
				];
				for (const data of await channel.messages.fetch()) {
					const message = data[1];
					if (!message.author.bot) {
						ticket.messages.push({
							author: message.author.id,
							content: message.content
						});

						transcript.push(`${message.author.username} (${message.author.id}): ${message.content}`);
					}
				}

				const user = await getUser(ticket.author.id);
				if (user) {
					const transcriptFile = new AttachmentBuilder(Buffer.from(transcript.join("\n"), "utf-8"), { name: `transcript-${ticketId}.txt`, description: "Text transcription of the ticket" });

					await user.send({
						content: "Your ticket has been closed. Here is the ticket file.",
						files: [transcriptFile]
					});
				}

				await interaction.editReply({
					content: "Ticket is now closed.",
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
			interaction.log(`Ticket file not found.`);
			await interaction.message.delete();
			await interaction.editReply({
				content: "This ticket does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}