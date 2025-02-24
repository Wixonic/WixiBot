const path = require("path");

/**
 * @type {import("../../types.d.ts").PathsSettings}
 */
const pathsSettings = {
	rank: (guildId) => path.join(root, "ranks", guildId)
};

module.exports = pathsSettings;