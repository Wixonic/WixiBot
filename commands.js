const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} ChatCommand
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.ChatInput} type
 * @property {import("discord.js").SlashCommandBuilder} data
 * @property {(interaction: import("discord.js").CommandInteraction) => Promise<void>} execute
 */

/**
 * @typedef {object} MessageCommand
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.Message} type
 * @property {import("discord.js").ContextMenuCommandBuilder} data
 * @property {(interaction: import("discord.js").MessageContextMenuCommandInteraction) => Promise<void>} execute
 */

/**
 * @typedef {object} UserCommand
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.User} type
 * @property {import("discord.js").ContextMenuCommandBuilder} data
 * @property {(interaction: import("discord.js").UserContextMenuCommandInteraction) => Promise<void>} execute
 */

/**
 * @typedef {ChatCommand | MessageCommand | UserCommand} Command
 */

/**
 * @type {Command[]}
 */
const list = [];

for (const file of fs.readdirSync("./commands").filter((file) => file.endsWith(".js"))) list.push(require(path.join(__dirname, "commands", file)));

module.exports = {
	list
};