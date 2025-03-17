const { ActivityType } = require("discord.js");

/**
 * @type {import("../types.d.ts").ListenerInfo}
 */
const listener = {
	name: "Ready",
	event: "ready",

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("discord.js").Client} client
	 */
	run: (logger, bot, client) => {
		logger.info("Connected as:", client.user.displayName);

		const packageInfo = require("../package.json");

		bot.user.setActivity({
			name: `/help - ${packageInfo.displayName} v${packageInfo.version}`,
			type: ActivityType.Custom
		});
	}
};

module.exports = listener;