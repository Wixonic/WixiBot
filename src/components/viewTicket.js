const { ComponentType } = require("discord.js");

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

	}
};

module.exports = component;