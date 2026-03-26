import type { Guild as DiscordGuild } from "discord.js";
import path from "node:path";

import { ChannelType } from "discord.js";
import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";
import { sendChunks } from "./utils.ts";

export interface GuildSettings {
	channels: {
		logs?: string;
	};
	tickets: {
		channel?: string;
		category?: string;
	};
};

export type TicketState = "Waiting" | "Claimed" | "Resolved" | "Closed";

export interface TicketData {
	id: string;
	date: string;
	reason?: string;
	state: TicketState;
	channel: string;
	interactions: {
		claimedBy?: string;
		closedBy?: string;
		viewedBy: string[];
	};
	messages: {
		channel: string;
		guild: string;
	};
};
export const guildSettingsSchema: DynamicSettingsSchema = {
	description: "Guild-specific settings",
	type: "object",
	children: {
		channels: {
			key: "channels",
			name: "Channels",
			description: "Settings related to channels",
			type: "object",
			children: {
				logs: {
					key: "logs",
					name: "Logs channel",
					type: "channel",
					description: "The channel where I will send error reports and other logs. If not set, I will DM the server owner instead.",
					default: null
				}
			}
		},
		tickets: {
			key: "tickets",
			name: "Tickets",
			description: "Settings related to support tickets",
			type: "object",
			children: {
				channel: {
					key: "channel",
					name: "Ticket channel",
					type: "channel",
					channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
					description: "The channel where I will create support tickets. If not set, I will create them in the current channel.",
					default: null
				},
				category: {
					key: "category",
					name: "Ticket category",
					type: "section",
					description: "The category where support ticket channels will be created.",
					default: null
				}
			}
		}
	}
};

export class Guild {
	#discordGuild: DiscordGuild;
	#storagePath: string;
	#settings: GuildSettings = {
		channels: {},
		tickets: {}
	};
	#logger: Logger;

	constructor(logger: Logger, discordGuild: DiscordGuild) {
		this.#discordGuild = discordGuild;
		this.#logger = logger.clone(`[G-${discordGuild.id}]`);
		this.#storagePath = `./storage/guilds/${discordGuild.id}/`;
	};

	get id() { return this.#discordGuild.id; };
	get name() { return this.#discordGuild.name; };
	get settings() { return this.#settings; };

	async init() {
		this.#logger.debug("Initializing guild...");

		try {
			await Deno.mkdir(this.#storagePath.split("/").slice(0, -1).join("/"), { recursive: true });
			try {
				const content = await Deno.readTextFile(path.join(this.#storagePath, "settings.json"));
				this.#settings = JSON.parse(content);
				this.#logger.debug("Loaded existing guild settings.");
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					await this.saveSettings();
					this.#logger.debug("Created new guild settings.");

					try {
						const owner = await this.#discordGuild.fetchOwner();

						const helpCommandId = await client.getCommandId("help", this.id);
						const settingsCommandId = await client.getCommandId("settings", this.id);
						const settingsCommandText = settingsCommandId ? `</settings:${settingsCommandId}>` : "`/settings`";

						await sendChunks(`Hi!
I was successfully installed and initialized for your server **${this.name}**.

Check the available commands by typing ${helpCommandId ? `</help:${helpCommandId}>` : "`/help`"}.

> **Tip**: You can configure an error logging channel and a moderation channel so that I can send you reports directly in your server instead of DMs.
> Use ${settingsCommandText} to set it up!`, owner.send.bind(owner));
					} catch (error) {
						this.#logger.warn("Failed to notify guild owner. DMs might be closed.", {
							cause: error
						});
					}
				} else throw error;
			}
		} catch (error) {
			this.#logger.error("Failed to initialize guild storage", {
				cause: error
			});
		}

		client.addGuild(this);
	};

	async saveSettings() {
		await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings, null, "\t"));
	};

	async createTicket(ticketId: string, channel: string, messages: { channel: string; guild: string }, reason?: string): Promise<TicketData> {
		const ticketData: TicketData = {
			id: ticketId,
			date: new Date().toISOString(),
			reason,
			state: "Waiting",
			channel,
			interactions: {
				viewedBy: []
			},
			messages
		};

		await this.saveTicket(ticketData);
		return ticketData;
	};

	async saveTicket(ticket: TicketData): Promise<void> {
		const ticketsDir = path.join(this.#storagePath, "tickets");
		await Deno.mkdir(ticketsDir, { recursive: true });
		await Deno.writeTextFile(
			path.join(ticketsDir, `${ticket.id}.json`),
			JSON.stringify(ticket, null, "\t")
		);
	};

	async loadTicket(ticketId: string): Promise<TicketData | null> {
		try {
			const content = await Deno.readTextFile(path.join(this.#storagePath, "tickets", `${ticketId}.json`));
			return JSON.parse(content) as TicketData;
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) return null;
			throw error;
		}
	};

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		if (this.#settings.channels.logs) {
			const channel = this.#discordGuild.channels.cache.get(this.#settings.channels.logs);

			if (channel && channel.isTextBased()) sendChunks(`An error occurred:
					\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``, channel.send.bind(channel)).catch(() => { });
		} else this.#discordGuild.fetchOwner()
			.then(async (owner) => {
				const settingsCommandId = await client.getCommandId("settings", this.id);
				const settingsCommandText = settingsCommandId ? `</settings:${settingsCommandId}>` : "`/settings`";

				sendChunks(`An error occurred in your server **${this.name}**:
\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\`

> **Tip**: You can configure an error logging channel so that I can send you reports directly in your server instead of DMs.
> Use ${settingsCommandText} to set it up!`, owner.send.bind(owner)).catch(() => { });
			}).catch(() => { });
	};
};