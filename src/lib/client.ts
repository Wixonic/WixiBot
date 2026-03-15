import { ActivityType, type ChatInputCommandInteraction, Client as DiscordClient, type ContextMenuCommandBuilder, Events, GatewayIntentBits, type MessageContextMenuCommandInteraction, type ModalSubmitInteraction, type SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder, type SlashCommandSubcommandsOnlyBuilder, type UserContextMenuCommandInteraction, type MessageComponentInteraction, MessageFlags } from "discord.js";
import EventEmitter from "node:events";

import { Guild } from "./guild.ts";
import type { Logger } from "./logger.ts";
import type { ClientSettings } from "./settings.ts";
import { User } from "./user.ts";

export interface Command {
	data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder;
	execute: (logger: Logger, client: Client, interaction: ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction) => Promise<void>;
};

export interface Component {
	customId: string | RegExp;
	execute: (logger: Logger, client: Client, interaction: MessageComponentInteraction) => Promise<void>;
};

export interface Modal {
	customId: string | RegExp;
	execute: (logger: Logger, client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
};

class Client extends EventEmitter {
	#discordClient: DiscordClient | null = null;
	#logger!: Logger;
	#settings: ClientSettings | null = null;

	#commands = new Map<string, Command>();
	#components = new Set<Component>();
	#modals = new Set<Modal>();
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
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.MessageContent
			],
			presence: {
				activities: [{
					name: `/help - v${(await import("../../deno.json", { with: { type: "json" } })).default.version}`,
					type: ActivityType.Custom
				}]
			}
		});

		this.#discordClient.on("error", (e) => this.emit("error", e));

		await this.loadCommands();
		await this.loadComponents();
		await this.loadEvents();
		await this.loadModals();

		await this.#discordClient.login(settings.token);
	};

	async destroy() {
		await this.#discordClient?.destroy();
		this.#discordClient = null;
		this.#settings = null;
	};

	addGuild(guild: Guild) {
		this.#guilds.set(guild.id, guild);
		this.#logger.debug(`[Guilds] Registered guild ${guild.name} (${guild.id})`);
	};

	getGuild(id: string) {
		return this.#guilds.get(id);
	};

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
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load events", {
				cause: e
			});
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
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load commands", {
				cause: e
			});
		}
	};

	async loadComponents() {
		const logger = this.#logger.clone(() => "[Components]");

		try {
			let count = 0;

			for await (const dirEntry of Deno.readDir("./src/components")) {
				if (dirEntry.isFile && (dirEntry.name.endsWith(".ts") || dirEntry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../components/${dirEntry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);
					if ("component" in module) {
						this.#components.add(module.component);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} component${count === 1 ? "" : "s"}.`);
		} catch (e) {
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load components", {
				cause: e
			});
		}
	};

	async loadModals() {
		const logger = this.#logger.clone(() => "[Modals]");

		try {
			let count = 0;

			for await (const dirEntry of Deno.readDir("./src/modals")) {
				if (dirEntry.isFile && (dirEntry.name.endsWith(".ts") || dirEntry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../modals/${dirEntry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("modal" in module) {
						this.#modals.add(module.modal);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} modal${count === 1 ? "" : "s"}.`);
		} catch (e) {
			if (!(e instanceof Deno.errors.NotFound)) logger.error("Failed to load modals", {
				cause: e
			});
		}

		this.#discordClient?.on(Events.InteractionCreate, async (interaction) => {
			if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
				if (interaction.guildId && !this.#guilds.has(interaction.guildId)) {
					const discordGuild = interaction.guild ?? await this.#discordClient?.guilds.fetch(interaction.guildId).catch(() => null);

					if (discordGuild) {
						const guild = new Guild(logger, discordGuild);
						await guild.init();
					}
				}

				if (!this.#users.has(interaction.user.id)) {
					const user = new User(logger, interaction.user);
					await user.init();
				}

				const commandObject = this.#commands.get(interaction.commandName);

				try {
					await commandObject?.execute(logger, this, interaction);
				} catch (e) {
					logger.error(`Error executing ${interaction.commandName}`, {
						cause: e
					});

					if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while executing this command!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while executing this command!",
						flags: MessageFlags.Ephemeral
					});
				}
			} else if (interaction.isMessageComponent()) {
				const componentObject = Array.from(this.#components).find((component) => {
					if (component.customId instanceof RegExp) return component.customId.test(interaction.customId);
					return component.customId === interaction.customId || interaction.customId.startsWith(`${component.customId}:`);
				});

				try {
					await componentObject?.execute(logger, this, interaction);
				} catch (e) {
					logger.error(`Error handling component ${interaction.customId}`, {
						cause: e
					});

					if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while interacting with this component!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while interacting with this component!",
						flags: MessageFlags.Ephemeral
					});
				}
			} else if (interaction.isModalSubmit()) {
				const modalObject = Array.from(this.#modals).find((modal) => {
					if (modal.customId instanceof RegExp) return modal.customId.test(interaction.customId);
					return modal.customId === interaction.customId || interaction.customId.startsWith(`${modal.customId}:`);
				});

				try {
					await modalObject?.execute(logger, this, interaction);
				} catch (e) {
					logger.error(`Error handling modal ${interaction.customId}`, {
						cause: e
					});

					if (interaction.replied || interaction.deferred) await interaction.followUp({
						content: "There was an error while submitting this modal!",
						flags: MessageFlags.Ephemeral
					});
					else await interaction.reply({
						content: "There was an error while submitting this modal!",
						flags: MessageFlags.Ephemeral
					});
				}
			}
		});
	};

	get user() {
		return this.#discordClient?.user ?? null;
	};
};

export const client = new Client();