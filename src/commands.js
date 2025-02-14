const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

class CommandHandler {
	/**
	 * @param {Logger} logger
	 */
	constructor(logger) {
		this.logger = logger;
		this.slashCommands = [];
		this.userCommands = [];
		this.messageCommands = [];
	};

	loadCommands() {
		const commandsPath = path.join(__dirname, "commands");
		const files = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

		files.forEach(file => {
			const command = require(path.join(commandsPath, file));
			if (command.deploy && command.deploy.type) {
				switch (command.deploy.type) {
					case 1:
						this.slashCommands.push(command.deploy);
						break;

					case 2:
						this.userCommands.push(command.deploy);
						break;

					case 3:
						this.messageCommands.push(command.deploy);
						break;

					default:
						this.logger.warn("Unknown type at:", file);
						break;
				}

				this.logger.debug("Loaded command:", command.name);
			} else this.logger.warn("Invalid command:", command.name);
		});
	};

	/**
	 * @param {string} applicationId
	 * @param {string} token
	 */
	async deployCommands(applicationId, token) {
		const allCommands = [
			...this.slashCommands,
			...this.userCommands,
			...this.messageCommands
		];

		if (!token) this.logger.error("Missing bot token");

		const rest = new REST({ version: "10" }).setToken(token);

		try {
			this.logger.info(`Deploying ${allCommands.length} commands...`);
			await rest.put(Routes.applicationCommands(applicationId), {
				body: allCommands
			});
			this.logger.info("Commands successfully deployed");
		} catch (e) {
			this.logger.error("Failed to deploy commands:", e);
		}
	};

	destroy() {
		// Empty for now
	};
};

module.exports = CommandHandler;