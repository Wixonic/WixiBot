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
	run: (logger, client) => {
		logger.info("Connected as:", client.user.username);
	}
};

module.exports = listener;