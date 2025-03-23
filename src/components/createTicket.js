const { ComponentType } = require("discord.js");

/**
 * @type {import("../types").ComponentInfo}
 */
const component = {
	name: "Create Ticket",
	id: "createTicket",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {

	}
};

module.exports = component;