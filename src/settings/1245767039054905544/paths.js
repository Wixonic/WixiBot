const path = require("path");

const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").PathsSettings}
 */
const pathsSettings = {
	cache: path.join(secrets.paths.root, "cache"),
	rank: (guildId) => path.join(secrets.paths.root, "ranks", guildId)
};

module.exports = pathsSettings;