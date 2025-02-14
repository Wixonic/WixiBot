/**
 * @type {CommandInfo}
 */
const info = {
	name: "Help",
	deploy: {
		type: 1,
		name: "help",
		description: "Need help?"
	},

	/**
	 * @param {Logger} logger
	 * @param {import("discord.js").CommandInteraction}
	 */
	run: (logger, interaction) => {
		logger.info(interaction.user.username, "used Help.");
	}
};

module.exports = info;