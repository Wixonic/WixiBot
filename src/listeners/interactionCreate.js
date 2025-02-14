/**
 * @type {ListenerInfo}
 */
const listener = {
	name: "Interaction Create",
	event: "interactionCreate",

	/**
	 * @param {Logger} logger
	 * @param {import("discord.js").Interaction} interaction
	 */
	run: (logger, interaction) => {
		logger.info("Hey");

		// Execute commands
	}
};

module.exports = listener;