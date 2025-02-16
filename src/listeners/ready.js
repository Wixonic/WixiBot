const { ActivityType } = require("discord.js");

/**
 * @type {ListenerInfo}
 */
const listener = {
	name: "Ready",
	event: "ready",

	/**
	 * @param {Logger} logger
	 * @param {import("discord.js").Client} client
	 */
	run: (bot, logger, client) => {
		logger.info("Connected as:", client.user.username);

		const package = require("../package.json");

		bot.user.setActivity({
			name: `/help - ${package.displayName} v${package.version}`,
			type: ActivityType.Custom
		});
	}
};

module.exports = listener;