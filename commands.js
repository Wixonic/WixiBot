const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} ChatCommand
 * @property {import("discord.js").SlashCommandBuilder} data
 * @property {(interaction: import("discord.js").CommandInteraction) => Promise<void>} execute
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.ChatInput} type
 */

/**
 * @typedef {object} MessageCommand
 * @property {import("discord.js").ContextMenuCommandBuilder} data
 * @property {(interaction: import("discord.js").MessageContextMenuCommandInteraction) => Promise<void>} execute
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.Message} type
 */

/**
 * @typedef {object} UserCommand
 * @property {import("discord.js").ContextMenuCommandBuilder} data
 * @property {(interaction: import("discord.js").UserContextMenuCommandInteraction) => Promise<void>} execute
 * @property {string} name
 * @property {import("discord.js").ApplicationCommandType.User} type
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