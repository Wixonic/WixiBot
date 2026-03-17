import { ActivityType, Client as DiscordClient, type ContextMenuCommandBuilder, GatewayIntentBits, type ChatInputCommandInteraction, type MessageComponentInteraction, type MessageContextMenuCommandInteraction, type ModalSubmitInteraction, type SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder, type SlashCommandSubcommandsOnlyBuilder, type UserContextMenuCommandInteraction } from "discord.js";
import EventEmitter from "node:events";

import type { Guild } from "./guild.ts";
import type { Logger } from "./logger.ts";
import type { ClientSettings } from "./settings.ts";
import type { User } from "./user.ts";

export type AnyCommandInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export interface Command<InteractionType extends AnyCommandInteraction = AnyCommandInteraction> {
	data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder;
	execute: (logger: Logger, client: Client, interaction: InteractionType) => Promise<void>;
};

export interface Component {
	customId: string | RegExp;
	execute: (logger: Logger, client: Client, interaction: MessageComponentInteraction, ...options: string[]) => Promise<void>;
};

export interface Modal {
	customId: string | RegExp;
	execute: (logger: Logger, client: Client, interaction: ModalSubmitInteraction, ...options: string[]) => Promise<void>;
};

export interface Job {
	cron: string;
	name: string;
	execute: (logger: Logger) => void | Promise<void>;
};

export class Client extends EventEmitter {
	#discordClient: DiscordClient | null = null;
	#logger!: Logger;
	#settings: ClientSettings | null = null;

	#commands = new Map<string, Command>();
	#components = new Set<Component>();
	#modals = new Set<Modal>();
	#guilds = new Map<string, Guild>();
	#users = new Map<string, User>();
	#jobs = new Map<string, AbortController>();

	async init(logger: Logger, settings: ClientSettings) {
		this.#logger = logger;
		this.#settings = settings;

		logger.debug("Initializing Discord client...");

		this.#discordClient = new DiscordClient({
			...settings.discord.options,
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
		await this.loadJobs();

		await this.#discordClient.login(settings.discord.token);
	};

	async destroy() {
		this.stopJobs();
		await this.#discordClient?.destroy();
		this.#discordClient = null;
		this.#settings = null;
	};

	stopJobs() {
		const logger = this.#logger?.clone(() => "[Jobs]");
		const count = this.#jobs.size;

		for (const [name, controller] of this.#jobs) {
			controller.abort();
			logger?.debug(`Stopped job ${name}.`);
		}

		this.#jobs.clear();

		if (count > 0) logger?.debug(`Stopped ${count} active job${count === 1 ? "" : "s"}.`);
	};

	get discord() {
		return this.#discordClient;
	};

	get settings() {
		return this.#settings;
	};

	get user() {
		return this.#discordClient?.user ?? null;
	};

	getCommand(name: string) {
		return this.#commands.get(name);
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

	getComponent(customId: string) {
		return Array.from(this.#components).find((component) => {
			if (component.customId instanceof RegExp) return component.customId.test(customId);
			return component.customId === customId || customId.startsWith(`${component.customId}:`);
		});
	};

	getGuild(id: string) {
		return this.#guilds.get(id);
	};

	addGuild(guild: Guild) {
		this.#guilds.set(guild.id, guild);
	};

	getModal(customId: string) {
		return Array.from(this.#modals).find((modal) => {
			if (modal.customId instanceof RegExp) return modal.customId.test(customId);
			return modal.customId === customId || customId.startsWith(`${modal.customId}:`);
		});
	};

	getUser(id: string) {
		return this.#users.get(id);
	};

	addUser(user: User) {
		this.#users.set(user.id, user);
	};

	async loadCommands() {
		const logger = this.#logger.clone(() => "[Commands]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir("./src/commands")) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../commands/${entry.name}`, import.meta.url).href;
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

			for await (const entry of Deno.readDir("./src/components")) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../components/${entry.name}`, import.meta.url).href;
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

	async loadEvents() {
		const logger = this.#logger.clone(() => "[Events]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir("./src/events")) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../events/${entry.name}`, import.meta.url).href;
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

	async loadJobs() {
		const logger = this.#logger.clone(() => "[Jobs]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir("./src/jobs")) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../jobs/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("job" in module) {
						const job: Job = module.job;

						if (this.#jobs.has(job.name)) {
							logger.warn(`Skipped job ${job.name}: already active.`);
							continue;
						}

						const controller = new AbortController();

						try {
							Deno.cron(job.name, job.cron, {
								signal: controller.signal
							}, async () => {
								try {
									await job.execute(logger);
								} catch (error) {
									logger.error(`Failed to execute job ${job.name}`, {
										cause: error
									});
								}
							});

							this.#jobs.set(job.name, controller);
							count++;
							logger.debug(`Registered job ${job.name} (${job.cron}).`);
						} catch (error) {
							controller.abort();
							logger.error(`Failed to register job ${job.name}`, {
								cause: error
							});
						}
					}
				}
			}

			logger.debug(`Loaded ${count} job${count === 1 ? "" : "s"}.`);
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) logger.error("Failed to load jobs", {
				cause: error
			});
		}
	};

	async loadModals() {
		const logger = this.#logger.clone(() => "[Modals]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir("./src/modals")) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../modals/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("modal" in module) {
						this.#modals.add(module.modal);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} modal${count === 1 ? "" : "s"}.`);
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) logger.error("Failed to load modals", {
				cause: error
			});
		}
	};

};

export const client = new Client();