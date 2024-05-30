const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} Modal
 * @property {string} name
 * @property {(interaction: import("discord.js").ModalSubmitInteraction, args: string[]) => Promise<void>} execute
 */

/**
 * @type {Button[]}
 */
const list = [];

for (const file of fs.readdirSync("./modals").filter((file) => file.endsWith(".js"))) list.push(require(path.join(__dirname, "modals", file)));

module.exports = {
	list
};