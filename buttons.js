const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} Button
 * @property {string} name
 * @property {number} args
 * @property {(interaction: import("discord.js").UserContextMenuCommandInteraction, args: string[]) => Promise<void>} execute
 */

/**
 * @type {Button[]}
 */
const list = [];

for (const file of fs.readdirSync("./buttons").filter((file) => file.endsWith(".js"))) list.push(require(path.join(__dirname, "buttons", file)));

module.exports = {
	list
};