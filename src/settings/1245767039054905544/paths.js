const path = require("path");

const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").PathsSettings}
 */
const pathsSettings = {
	cache: path.join(secrets.paths.root, "cache"),
	giveaway: (guildId, giveawayId) => path.join(secrets.paths.root, "giveaways", guildId, giveawayId + ".json"),
	giveaways: (guildId) => path.join(secrets.paths.root, "giveaways", guildId),
	markdown: {
		help: path.join(__dirname, "help.md"),
		privacy: path.join(__dirname, "privacy.md"),
		rules: path.join(__dirname, "rules.md"),
		ticket: path.join(__dirname, "ticket.md")
	},
	leaderboard: (guildId) => path.join(secrets.paths.root, "ranks", "leaderboards", guildId + ".json"),
	rank: (guildId, memberId) => path.join(secrets.paths.root, "ranks", guildId, memberId + ".json"),
	ranks: (guildId) => path.join(secrets.paths.root, "ranks", guildId),
	roles: path.join(__dirname, "roles.js")
};

module.exports = pathsSettings;