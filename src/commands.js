const { ApplicationCommandType, REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

class CommandHandler {
	/**
	 * @type {CommandInfo[]}
	 */
	static slashCommands = [];

	/**
	 * @type {CommandInfo[]}
	 */
	static userCommands = [];

	/**
	 * @type {CommandInfo[]}
	 */
	static messageCommands = [];

	/**
	 * @type {CommandInfo[]}
	 */
	static get commands() {
		return [
			...CommandHandler.slashCommands,
			...CommandHandler.userCommands,
			...CommandHandler.messageCommands
		];
	};

	/**
	 * @param {Logger} logger
	 */
	constructor(logger) {
		this.logger = logger;
	};

	loadCommands() {
		const commandsPath = path.join(__dirname, "commands");
		const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const modulePath = path.join(commandsPath, file);
			delete require.cache[require.resolve(modulePath)];
			const command = require(modulePath);

			if (command.deploy && command.deploy.type) {
				switch (command.deploy.type) {
					case ApplicationCommandType.ChatInput:
						CommandHandler.slashCommands.push(command);
						break;

					case ApplicationCommandType.User:
						CommandHandler.userCommands.push(command);
						break;

					case ApplicationCommandType.Message:
						CommandHandler.messageCommands.push(command);
						break;

					default:
						this.logger.warn("Unknown type at:", file);
						break;
				}

				this.logger.debug("Loaded command:", command.name);
			} else this.logger.warn("Invalid command:", command.name);
		}
	};

	/**
	 * @param {string} applicationId
	 * @param {string} token
	 */
	async deployCommands(applicationId, token) {
		if (!token) this.logger.error("Missing bot token");

		const rest = new REST({ version: "10" }).setToken(token);

		const deploys = [];
		for (const command of CommandHandler.commands) deploys.push(command.deploy);

		try {
			this.logger.info(`Deploying ${deploys.length} commands...`);
			await rest.put(Routes.applicationCommands(applicationId), {
				body: deploys
			});
			this.logger.info("Commands successfully deployed");
		} catch (e) {
			this.logger.error("Failed to deploy commands:", e);
		}
	};
};

module.exports = CommandHandler;