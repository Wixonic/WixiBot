import {
	ActivityType,
	Client as DiscordClient,
	type ContextMenuCommandBuilder,
	GatewayIntentBits,
	type ChatInputCommandInteraction,
	type MessageComponentInteraction,
	type MessageContextMenuCommandInteraction,
	type ModalSubmitInteraction,
	type SlashCommandBuilder,
	type SlashCommandOptionsOnlyBuilder,
	type SlashCommandSubcommandsOnlyBuilder,
	type UserContextMenuCommandInteraction,
	Partials
} from "discord.js";
import EventEmitter from "node:events";

import { Guild } from "./guild.ts";
import { logger as defaultLogger, type Logger } from "./logger.ts";
import type { ClientSettings } from "./settings.ts";
import { User } from "./user.ts";

export type AnyCommandInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;

export interface Command<InteractionType extends AnyCommandInteraction = AnyCommandInteraction> {
	data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder;
	execute: (logger: Logger, interaction: InteractionType) => Promise<void>;
};

export interface Component {
	customId: string | RegExp;
	execute: (logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) => Promise<void>;
};

export interface Modal {
	customId: string | RegExp;
	execute: (logger: Logger, interaction: ModalSubmitInteraction, ...options: string[]) => Promise<void>;
};

export interface Job {
	cron: string;
	name: string;
	enabled?: boolean;
	execute: (logger: Logger) => void | Promise<void>;
};

export class Client extends EventEmitter {
	discord: DiscordClient | null = null;
	private logger: Logger = defaultLogger;
	private settings: ClientSettings | null = null;

	private commands = new Map<string, Command>();
	private components = new Set<Component>();
	private modals = new Set<Modal>();
	private guilds = new Map<string, Guild>();
	users = new Map<string, User>();
	jobs = new Map<string, Job>();
	private jobControllers = new Map<string, AbortController>();

	async init(logger: Logger, settings: ClientSettings) {
		this.logger = logger;
		this.settings = settings;

		logger.debug("Initializing Discord client...");

		this.discord = new DiscordClient({
			...settings.discord.options,
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessageReactions
			],
			partials: [
				Partials.Message,
				Partials.Reaction,
				Partials.User
			],
			presence: {
				activities: [{
					name: `/help - v${(await import("../../deno.json", { with: { type: "json" } })).default.version}`,
					type: ActivityType.Custom
				}]
			}
		});

		this.discord.on("error", (error) => this.emit("error", error));

		await this.loadCommands();
		await this.loadComponents();
		await this.loadEvents();
		await this.loadModals();
		await this.loadJobs();

		await this.discord.login(settings.discord.token);
	};

	async destroy() {
		this.stopJobs();
		await this.discord?.destroy();
		this.discord = null;
		this.settings = null;
	};

	stopJobs() {
		const logger = this.logger?.clone(() => "[Jobs]");
		const count = this.jobControllers.size;

		for (const [name, controller] of this.jobControllers) {
			controller.abort();
			logger?.debug(`Stopped job ${name}.`);
		}

		this.jobControllers.clear();

		if (count > 0) logger?.debug(`Stopped ${count} active job${count === 1 ? "" : "s"}.`);
	};

	get user() {
		return this.discord?.user ?? null;
	};

	getCommand(name: string) {
		return this.commands.get(name);
	};

	async getCommandId(name: string, guildId?: string): Promise<string | null> {
		if (this.discord?.application) {
			try {
				const globalCommands = await this.discord.application.commands.fetch();
				const globalCommand = globalCommands.find((command) => command.name === name);
				if (globalCommand) return globalCommand.id;

				if (guildId) {
					const guild = await this.discord.guilds.fetch(guildId).catch(() => null);

					if (guild) {
						const localCommands = await guild.commands.fetch();
						const localCommand = localCommands.find((command) => command.name === name);
						if (localCommand) return localCommand.id;
					}
				}
			} catch (error) {
				this.logger.error(`Failed to fetch command ID for ${name}`, { cause: error });
			}

			return null;
		}

		return null;
	};

	getComponent(customId: string) {
		return Array.from(this.components).find((component) => {
			if (component.customId instanceof RegExp) return component.customId.test(customId);
			return component.customId === customId || customId.startsWith(`${component.customId}:`);
		});
	};

	async getGuild(id: string) {
		let guild = this.guilds.get(id);

		if (!guild) {
			try {
				const discordGuild = await this.discord?.guilds.fetch(id);
				if (!discordGuild) throw new Error(`Client is not ready`);

				guild = new Guild(this.logger.clone(() => `[Guild ${id}]`), discordGuild);
				await guild.init();
				this.addGuild(guild);
			} catch (error) {
				this.logger.warn(`Failed to fetch guild ${id}`, { cause: error });
				return null;
			}
		}

		guild.touch();
		return guild;
	};

	addGuild(guild: Guild) {
		this.guilds.set(guild.id, guild);
	};

	getModal(customId: string) {
		return Array.from(this.modals).find((modal) => {
			if (modal.customId instanceof RegExp) return modal.customId.test(customId);
			return modal.customId === customId || customId.startsWith(`${modal.customId}:`);
		});
	};

	async getUser(id: string) {
		let user = this.users.get(id);

		if (!user) {
			try {
				const discordUser = await this.discord?.users.fetch(id);
				if (!discordUser) throw new Error(`Client is not ready`);

				user = new User(this.logger.clone(() => `[User ${id}]`), discordUser);
				await user.init();
				this.addUser(user);
			} catch (error) {
				this.logger.warn(`Failed to fetch user ${id}`, { cause: error });
				return null;
			}
		}

		user.touch();
		return user;
	};

	addUser(user: User) {
		this.users.set(user.id, user);
	};

	getJob(name: string) {
		return this.jobs.get(name);
	};

	async runJob(name: string, customLogger?: Logger) {
		const job = this.jobs.get(name);
		if (!job) return false;
		const logger = customLogger ?? this.logger.clone(() => `[Job ${name}]`);
		await job.execute(logger);
		return true;
	};

	sweep() {
		const threshold = Date.now() - 15 * 60 * 1000;
		let usersSwept = 0;
		let guildsSwept = 0;

		for (const [id, user] of this.users) {
			if (user.lastAccessed < threshold) {
				this.users.delete(id);
				usersSwept++;
			}
		}

		for (const [id, guild] of this.guilds) {
			if (guild.lastAccessed < threshold) {
				this.guilds.delete(id);
				guildsSwept++;
			}
		}

		if (usersSwept > 0 || guildsSwept > 0) this.logger.debug(`Swept ${usersSwept} users and ${guildsSwept} guilds.`);
	};

	async loadCommands() {
		const logger = this.logger.clone(() => "[Commands]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir(new URL("../commands", import.meta.url))) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../commands/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("command" in module) {
						const command = module.command;
						this.commands.set(command.data.name, command);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} command${count === 1 ? "" : "s"}.`);
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) logger.error("Failed to load commands", {
				cause: error
			});
		}
	};

	async loadComponents() {
		const logger = this.logger.clone(() => "[Components]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir(new URL("../components", import.meta.url))) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../components/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);
					if ("component" in module) {
						this.components.add(module.component);
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} component${count === 1 ? "" : "s"}.`);
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) logger.error("Failed to load components", {
				cause: error
			});
		}
	};

	async loadEvents() {
		const logger = this.logger.clone(() => "[Events]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir(new URL("../events", import.meta.url))) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../events/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("event" in module) {
						const event = module.event;
						if (event.once) this.discord?.once(event.type, (...args) => event.execute(logger, ...args));
						else this.discord?.on(event.type, (...args) => event.execute(logger, ...args));
						count++;
					}
				}
			}

			logger.debug(`Loaded ${count} event${count === 1 ? "" : "s"}.`);
		} catch (error) {
			if (!(error instanceof Deno.errors.NotFound)) logger.error("Failed to load events", {
				cause: error
			});
		}
	};

	async loadJobs() {
		const logger = this.logger.clone(() => "[Jobs]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir(new URL("../jobs", import.meta.url))) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../jobs/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("job" in module) {
						const job: Job = module.job;

						if (job.enabled === false) {
							logger.debug(`Skipped disabled job ${job.name}.`);
							continue;
						}

						if (this.jobControllers.has(job.name)) {
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

							this.jobControllers.set(job.name, controller);
							this.jobs.set(job.name, job);
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
		const logger = this.logger.clone(() => "[Modals]");

		try {
			let count = 0;

			for await (const entry of Deno.readDir(new URL("../modals", import.meta.url))) {
				if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
					const moduleUrl = new URL(`../modals/${entry.name}`, import.meta.url).href;
					const module = await import(moduleUrl);

					if ("modal" in module) {
						this.modals.add(module.modal);
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