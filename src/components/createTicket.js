const { ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Create Ticket",
	id: "createTicket",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
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
		logger.debug("Modal sent");
	}
};

module.exports = component;