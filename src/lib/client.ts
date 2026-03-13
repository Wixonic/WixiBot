import { ActivityType, type ChatInputCommandInteraction, Client as DiscordClient, type ContextMenuCommandBuilder, Events, GatewayIntentBits, type MessageContextMenuCommandInteraction, type ModalSubmitInteraction, type SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder, type SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import EventEmitter from "node:events";

import type { Guild } from "./guild.ts";
import type { Logger } from "./logger.ts";
import type { ClientSettings } from "./settings.ts";
import { User } from "./user.ts";

export interface Command {
	data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder;
	execute: (logger: Logger, client: Client, interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction) => Promise<void>;
	onModalSubmit?: (logger: Logger, client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
};

class Client extends EventEmitter {
	#discordClient: DiscordClient | null = null;
	#logger!: Logger;
	#settings: ClientSettings | null = null;

	#commands = new Map<string, Command>();
	#guilds = new Map<string, Guild>();
	#users = new Map<string, User>();

	async init(logger: Logger, settings: ClientSettings) {
		this.#logger = logger;
		this.#settings = settings;

		logger.debug("Initializing Discord client...");

		this.#discordClient = new DiscordClient({
			...settings.discord,
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildVoiceStates
			],
			presence: {
				activities: [{
					name: `/help - v${(await import("../../deno.json", { with: { type: "json" } })).default.version}`,
					type: ActivityType.Custom
				}]
			}
		});

		this.#discordClient.on("error", (e) => this.emit("error", e));

		await this.#discordClient.login(settings.token);
	};

	async destroy() {
		await this.#discordClient?.destroy();
		this.#discordClient = null;
		this.#settings = null;
	};

	async main() {
		this.#logger.debug("Loading components...");
		await this.loadEvents();
		await this.loadCommands();
	};
	addGuild(guild: Guild) {
		this.#guilds.set(guild.id, guild);
		this.#logger.debug(`[Guilds] Registered guild ${guild.name} (${guild.id})`);
	};

	getGuild(id: string) {
		return this.#guilds.get(id);
	}

	addUser(user: User) {
		this.#users.set(user.id, user);
		this.#logger.debug(`[Users] Registered user ${user.username} (${user.id})`);
	};

	getUser(id: string) {
		return this.#users.get(id);
	};

	async getCommandId(name: string, guildId?: string): Promise<string | null> {
		if (!this.#discordClient?.application) return null;

		try {
			const globalCommands = await this.#discordClient.application.commands.fetch();
			const globalCommand = globalCommands.find((command) => command.name === name);
			if (globalCommand) return globalCommand.id;

			if (guildId) {
				const guild = await this.#discordClient.guilds.fetch(guildId).catch(() => null);

				if (guild) {
					const localCommands = await guild.commands.fetch();
					const localCommand = localCommands.find((command) => command.name === name);
					if (localCommand) return localCommand.id;
				}
			}
		} catch (e) {
			this.#logger.error(`Failed to fetch command ID for ${name}`, { cause: e });
		}

		return null;
	};

	async loadEvents() {
		const logger = this.#logger.clone(() => "[Events]");

		try {
			let count = 0;
			for await (const dirEntry of Deno.readDir("./src/events")) {
				if (dirEntry.isFile && (dirEntry.name.endsWith(".ts") || dirEntry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../events/${dirEntry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("event" in module) {
						const event = module.event;
						if (event.once) this.#discordClient?.once(event.type, (...args) => event.execute(logger, ...args));
						else this.#discordClient?.on(event.type, (...args) => event.execute(logger, ...args));
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} event${count === 1 ? "" : "s"}.`);
		} catch (e) {
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load events", { cause: e });
		}
	};

	async loadCommands() {
		const logger = this.#logger.clone(() => "[Commands]");

		try {
			let count = 0;
			for await (const dirEntry of Deno.readDir("./src/commands")) {
				if (dirEntry.isFile && (dirEntry.name.endsWith(".ts") || dirEntry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../commands/${dirEntry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("command" in module) {
						const command = module.command;
						this.#commands.set(command.data.name, command);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} command${count === 1 ? "" : "s"}.`);
		} catch (e) {
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load commands", { cause: e });
		}

		this.#discordClient?.on(Events.InteractionCreate, async (interaction) => {
			if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
				if (!this.#users.has(interaction.user.id)) {
					const user = new User(logger, interaction.user);
					await user.init();
				}

				const command = this.#commands.get(interaction.commandName);
				if (!command) return logger.error(`No command matching ${interaction.commandName} was found.`);

				try {
					await command.execute(logger, this, interaction);
				} catch (e) {
					logger.error(`Error executing ${interaction.commandName}`, { cause: e });
					if (interaction.replied || interaction.deferred) await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
					else await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
				}
			} else if (interaction.isModalSubmit()) {
				const command = Array.from(this.#commands.values()).find((command) => interaction.customId === command.data.name || interaction.customId.startsWith(`${command.data.name}_`) || interaction.customId.startsWith(`${command.data.name}_`));
				if (!command || !command.onModalSubmit) return;

				try {
					await command.onModalSubmit(logger, this, interaction);
				} catch (e) {
					logger.error(`Error handling modal for ${interaction.customId}`, { cause: e });
					if (interaction.replied || interaction.deferred) await interaction.followUp({ content: "There was an error while submitting the modal!", ephemeral: true });
					else await interaction.reply({ content: "There was an error while submitting the modal!", ephemeral: true });
				}
			}
		});
	};

	get user() {
		return this.#discordClient?.user ?? null;
	};
};

export const client = new Client();