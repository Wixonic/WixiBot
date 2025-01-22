const { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "sendTicket",
	args: 0,
	execute: async (interaction) => {
		const member = await interaction.guild.members.fetch(interaction.member?.id);

		if (member) {
			await interaction.showModal(
				new ModalBuilder()
					.setCustomId("sendTicket")
					.setTitle("Ticket Tool")
					.setComponents(
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("title")
									.setLabel("Issue")
									.setPlaceholder("Summarize your issue")
									.setRequired(true)
									.setStyle(TextInputStyle.Short)
									.setMinLength(5)
							),
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("description")
									.setLabel("Details")
									.setPlaceholder("Describe your issue")
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph)
									.setMinLength(25)
							)
					)
					.toJSON()
			);
			interaction.log("Modal sent");
		} else {
			interaction.log("Failed to fetch member");
			await interaction.reply({
				content: "This interaction is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
};