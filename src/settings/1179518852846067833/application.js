const commands = require("./commands.js");
const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").ApplicationSettings}
 */
const applicationSettings = {
	clientId: "1179518852846067833",
	clientSecret: secrets.discord.application.secret,
	publicKey: "",
	token: secrets.discord.application.token,
	webhook: secrets.discord.webhook,

	guildId: "1020663521530351627",

	commands
};

module.exports = applicationSettings;