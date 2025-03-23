const { ApplicationCommandType, REST, Routes, InteractionContextType } = require("discord.js");
const fs = require("fs");
const path = require("path");

class CommandHandler {
	/**
	 * @type {import("../types.d.ts").CommandInfo[]}
	 */
	static slashCommands = [];

	/**
	 * @type {import("../types.d.ts").CommandInfo[]}
	 */
	static userCommands = [];

	/**
	 * @type {import("../types.d.ts").CommandInfo[]}
	 */
	static messageCommands = [];

	/**
	 * @type {import("../types.d.ts").CommandInfo[]}
	 */
	static get commands() {
		return [
			...CommandHandler.slashCommands,
			...CommandHandler.userCommands,
			...CommandHandler.messageCommands
		];
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 */
	constructor(logger) {
		this.logger = {
			debug: (...any) => logger.debug("[Commands]", ...any),
			error: (...any) => logger.error("[Commands]", ...any),
			info: (...any) => logger.info("[Commands]", ...any),
			warn: (...any) => logger.warn("[Commands]", ...any)
		};
	};

	loadCommands() {
		const commandsPath = path.join(__dirname, "..", "commands");
		const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const modulePath = path.join(commandsPath, file);
			delete require.cache[require.resolve(modulePath)];
			const command = require(modulePath);

			if (command.deploy && command.deploy.type) {
				switch (command.deploy.type) {
					case ApplicationCommandType.ChatInput:
						CommandHandler.slashCommands.push(command);
						this.logger.debug("Loaded slash command:", command.name);
						break;

					case ApplicationCommandType.User:
						CommandHandler.userCommands.push(command);
						this.logger.debug("Loaded user command:", command.name);
						break;

					case ApplicationCommandType.Message:
						CommandHandler.messageCommands.push(command);
						this.logger.debug("Loaded message command:", command.name);
						break;

					default:
						this.logger.warn("Unknown type at:", file);
						break;
				}
			} else this.logger.warn("Invalid command:", command.name);
		}
	};

	/**
	 * @param {string} applicationId
	 * @param {string} token
	 */
	async deployCommands(applicationId, token, guildId) {
		if (!token) this.logger.error("Missing bot token");

		const rest = new REST({ version: "10" }).setToken(token);

		const deploys = [];
		const guildDeploys = [];

		for (const command of CommandHandler.commands) {
			if ((command.deploy.contexts ?? []).includes(InteractionContextType.Guild)) guildDeploys.push(command.deploy);
			else deploys.push(command.deploy);
		}

		try {
			this.logger.info(`Deploying ${deploys.length} global commands...`);
			await rest.put(Routes.applicationCommands(applicationId), {
				body: deploys
			});
			this.logger.info("Global commands successfully deployed");
		} catch (e) {
			this.logger.error("Failed to deploy global commands:", e);
		}

		try {
			this.logger.info(`Deploying ${guildDeploys.length} guild commands...`);
			await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
				body: guildDeploys
			});
			this.logger.info("Guild commands successfully deployed");
		} catch (e) {
			this.logger.error("Failed to deploy guild commands:", e);
		}
	};
};

module.exports = CommandHandler;