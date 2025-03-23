const { ComponentType } = require("discord.js");

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

	}
};

module.exports = component;