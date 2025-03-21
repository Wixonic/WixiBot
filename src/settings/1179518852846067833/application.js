const commands = require("./commands.js");
const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").ApplicationSettings}
 */
const applicationSettings = {
	clientId: "1179518852846067833",
	clientSecret: secrets.discord.application.secret,
	publicKey: "c4ca4a071987566209192e7bd331276d3cf81faeb61acb0c78a1cc02ff11e562",
	token: secrets.discord.application.token,
	webhook: secrets.discord.webhook,

	adminRole: "1179522523201802290",
	defaultTextChannel: "1179535918277865614",
	guildId: "1020663521530351627",
	moderationChannel: "1020680767921197186",

	commands
};

module.exports = applicationSettings;