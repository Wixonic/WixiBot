const path = require("path");

const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").PathsSettings}
 */
const pathsSettings = {
	cache: path.join(secrets.paths.root, "cache"),
	markdown: {
		help: path.join(__dirname, "help.md"),
		privacy: path.join(__dirname, "privacy.md"),
		rules: path.join(__dirname, "rules.md"),
		ticket: path.join(__dirname, "ticket.md")
	},
	leaderboard: (guildId) => path.join(secrets.paths.root, "ranks", "leaderboards", guildId + ".json"),
	rank: (guildId) => path.join(secrets.paths.root, "ranks", guildId)
};

module.exports = pathsSettings;