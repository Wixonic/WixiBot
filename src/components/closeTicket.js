const { AttachmentBuilder, ComponentType, MessageFlags } = require("discord.js");

const fs = require("fs");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Close Ticket",
	id: "closeTicket",
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
				if (initialTicket.type == "CLAIMED") {
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

					for (const user of [ticket.author, ticket.claimedBy, ...ticket.viewers]) {
						if (user && user.id) channel.permissionOverwrites.edit(user.id, {
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

					const user = await bot.users.fetch(ticket.author.id);
					if (user) {
						const transcriptFile = new AttachmentBuilder(Buffer.from(transcript.join("\n"), "utf-8"), { name: `transcript-${ticketId}.txt`, description: "Text transcription of the ticket" });

						await user.send({
							content: "Your ticket has been closed. Here is the ticket file.",
							files: [transcriptFile]
						});
					}

					await interaction.followUp("Ticket is now closed.");
					fs.writeFileSync(ticketPath, JSON.stringify(ticket));
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