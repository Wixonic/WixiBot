const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

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
							),
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("description")
									.setLabel("Details")
									.setPlaceholder("Describe your issue")
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph)
							)
					)
					.toJSON()
			);
			interaction.log("Modal sent");
		} else {
			interaction.log("Failed to fetch member");
			await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
			});
		}
	}
}