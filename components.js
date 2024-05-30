const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} Component
 * @property {string} name
 * @property {number} args
 * @property {(interaction: import("discord.js").MessageComponentInteraction, args: string[]) => Promise<void>} execute
 */

/**
 * @type {Button[]}
 */
const list = [];

for (const file of fs.readdirSync("./components").filter((file) => file.endsWith(".js"))) list.push(require(path.join(__dirname, "components", file)));

module.exports = {
	list
};