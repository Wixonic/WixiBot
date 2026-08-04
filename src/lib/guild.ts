import type { APIInteractionGuildMember, Guild as DiscordGuild, GuildMember, Message } from "discord.js";
import path from "node:path";

import {
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	ContainerBuilder,
	MessageFlags,
	SeparatorSpacingSize
} from "discord.js";

import { client } from "./client.ts";
import type { DynamicSettingsSchema } from "./dynamicSettings.ts";
import type { Logger } from "./logger.ts";
import { sendChunks } from "./utils.ts";
import { generateRichPicture, RichPictureType } from "./richPicture.ts";
import { StickyMessage } from "./stickyMessage.ts";

export type TicketState = "Waiting" | "Claimed" | "Resolved" | "Closed";

export interface TicketData {
	id: string;
	date: string;
	reason?: string;
	state: TicketState;
	channel: string;
	interactions: {
		createdBy: string;
		claimedBy?: string;
		closedBy?: string;
		viewedBy: string[];
	};
	messages: {
		channel: string;
		guild: string;
	};
};

export type ReportType = "Message" | "User";

interface BaseReportData {
	date: string;
	type: ReportType;
	by: string | null;
	reason?: string;
};

export interface MessageReportData extends BaseReportData {
	type: "Message";
	message: {
		id: string;
		channelId: string;
		guildId: string;
		content: string;
	};
};

export interface UserReportData extends BaseReportData {
	type: "User";
	user: string;
};

export type ReportData = MessageReportData | UserReportData;

export interface GuildSettings {
	channels: {
		logs?: string;
		welcome?: string;
		bot?: string;
		supporters?: string;
		birthday?: string;
	};
	roles?: {
		active?: string;
		birthday?: string;
		server_booster?: string;
	};
	moderation: {
		reports?: string;
		warnings?: string;
		ignoredChannels?: string[];
		lowRiskChannels?: string[];
	};
	tickets: {
		channel?: string;
		category?: string;
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
				},
				welcome: {
					key: "welcome",
					name: "Welcome channel",
					type: "channel",
					description: "The channel where I will send welcome messages when new members join.",
					default: null
				},
				bot: {
					key: "bot",
					name: "Bot commands channel",
					type: "channel",
					description: "The channel where I will send notifications like level ups and achievements.",
					default: null
				},
				supporters: {
					key: "supporters",
					name: "New supporters channel",
					type: "channel",
					description: "The channel where I will announce new supporters and boosts.",
					default: null
				},
				birthday: {
					key: "birthday",
					name: "Birthday channel",
					type: "channel",
					description: "The channel where I will announce member birthdays.",
					default: null
				}
			}
		},
		roles: {
			key: "roles",
			name: "Roles",
			description: "Settings related to special roles",
			type: "object",
			children: {
				active: {
					key: "active",
					name: "Active Member role",
					type: "role",
					description: "The role automatically assigned to active members based on recent 28-day activity.",
					default: null
				},
				birthday: {
					key: "birthday",
					name: "Birthday role",
					type: "role",
					description: "The role automatically assigned to members on their birthday for 24 hours.",
					default: null
				},
				server_booster: {
					key: "server_booster",
					name: "Server Booster role",
					type: "role",
					description: "The role automatically assigned to members who have boosted the server.",
					default: null
				}
			}
		},
		moderation: {
			key: "moderation",
			name: "Moderation",
			description: "Settings related to moderation",
			type: "object",
			children: {
				reports: {
					key: "reports",
					name: "Reports channel",
					type: "channel",
					description: "The channel where I will send moderation reports.",
					default: null
				},
				warnings: {
					key: "warnings",
					name: "Warnings channel",
					type: "channel",
					description: "The channel where I will send warning notifications.",
					default: null
				},
				ignoredChannels: {
					key: "ignoredChannels",
					name: "Ignored channels",
					type: "channel",
					multiple: true,
					description: "Channels or categories where moderation will be completely disabled.",
					default: null
				},
				lowRiskChannels: {
					key: "lowRiskChannels",
					name: "Low risk channels",
					type: "channel",
					multiple: true,
					description: "Channels or categories where moderation will be lighter (no auto warn, no deletion).",
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
		roles: {},
		moderation: {},
		tickets: {}
	};
	#logger: Logger;
	#lastAccessed: number = Date.now();
	private supportersStickyMessage: StickyMessage | null = null;

	constructor(logger: Logger, discordGuild: DiscordGuild) {
		this.#discordGuild = discordGuild;
		this.#logger = logger.clone(`[G-${discordGuild.id}]`);
		this.#storagePath = `./storage/guilds/${discordGuild.id}/`;
	}

	get id() { return this.#discordGuild.id; }
	get name() { return this.#discordGuild.name; }
	get settings() { return this.#settings; }
	get lastAccessed() { return this.#lastAccessed; }

	touch() { this.#lastAccessed = Date.now(); }

	async init() {
		this.#logger.debug("Initializing guild...");

		try {
			await Deno.mkdir(path.dirname(this.#storagePath), { recursive: true });
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
	}

	async saveSettings() {
		await Deno.writeTextFile(path.join(this.#storagePath, "settings.json"), JSON.stringify(this.#settings));
	}

	async #notifyOwnerFallback(content: string, purpose: string) {
		try {
			const owner = await this.#discordGuild.fetchOwner();
			const settingsCommandId = await client.getCommandId("settings", this.id);
			const settingsCommandText = settingsCommandId ? `</settings:${settingsCommandId}>` : "`/settings`";

			let purposeText = purpose;
			if (purpose === "logs") purposeText = "error logging";

			await sendChunks(`${content}

> **Tip**: You can configure a ${purposeText} channel so that I can send you reports directly in your server instead of DMs.
> Use ${settingsCommandText} to set it up!`, owner.send.bind(owner));
		} catch (error) {
			this.#logger.warn("Failed to notify guild owner. DMs might be closed.", {
				cause: error
			});
		}
	}

	async createTicket(ticketId: string, channel: string, createdBy: string, messages: { channel: string; guild: string }, reason?: string, state: TicketState = "Waiting", claimedBy?: string): Promise<TicketData> {
		const ticketData: TicketData = {
			id: ticketId,
			date: new Date().toISOString(),
			reason,
			state,
			channel,
			interactions: {
				createdBy,
				claimedBy,
				viewedBy: []
			},
			messages
		};

		await this.saveTicket(ticketData);
		return ticketData;
	}

	async saveTicket(ticket: TicketData): Promise<void> {
		const ticketsDirectory = path.join(this.#storagePath, "tickets");
		await Deno.mkdir(ticketsDirectory, { recursive: true });
		await Deno.writeTextFile(path.join(ticketsDirectory, `${ticket.id}.json`), JSON.stringify(ticket));
	}

	async loadTicket(ticketId: string): Promise<TicketData | null> {
		try {
			const content = await Deno.readTextFile(path.join(this.#storagePath, "tickets", `${ticketId}.json`));
			return JSON.parse(content) as TicketData;
		} catch (error) {
			if (error instanceof Deno.errors.NotFound) return null;
			throw error;
		}
	}

	async warn(target: GuildMember, by: GuildMember | APIInteractionGuildMember | null, reason: string) {
		const moderationDirectory = path.join(this.#storagePath, "moderation", target.id, "warnings");

		await Deno.mkdir(moderationDirectory, {
			recursive: true
		});

		await Deno.writeTextFile(path.join(moderationDirectory, `${Date.now()}.json`), JSON.stringify({
			date: new Date().toISOString(),
			reason,
			by: by?.user.id || null
		}));

		if (this.settings.moderation.warnings) {
			const channel = await this.#discordGuild.channels.fetch(this.settings.moderation.warnings);
			if (channel && channel.isTextBased()) {
				const buffer = await generateRichPicture({
					type: RichPictureType.Warn,
					data: {
						targetUsername: target.displayName,
						targetAvatarUrl: target.user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
						moderatorUsername: by ? ("displayName" in by && by.displayName ? (by.displayName as string) : ("user" in by ? by.user.username : undefined)) : undefined,
						reason
					}
				});
				const attachment = new AttachmentBuilder(buffer, { name: "warn.png" });
				await channel.send({ files: [attachment] });
			} else this.reportError("Configured warnings channel not found or not text-based", new Error(`Channel ID: ${this.settings.moderation.warnings}`));
		} else this.#notifyOwnerFallback(`A user was warned in your server **${this.name}**:\n${`User <@${target.id}> has been warned${by ? ` by <@${by.user.id}>` : ""}.\nReason: ${reason}`}`, "warnings");
	}

	async reportMessage(message: Message, by: GuildMember | APIInteractionGuildMember | null, reason?: string) {
		const moderationDirectory = path.join(this.#storagePath, "moderation", message.author.id, "reports");

		await Deno.mkdir(moderationDirectory, {
			recursive: true
		});

		await Deno.writeTextFile(path.join(moderationDirectory, `${Date.now()}.json`), JSON.stringify({
			date: new Date().toISOString(),
			type: "Message",
			message: {
				id: message.id,
				channelId: message.channelId,
				guildId: message.guildId,
				content: message.content
			},
			by: by?.user.id || null,
			reason
		}));

		if (this.settings.moderation.reports) {
			const channel = await this.#discordGuild.channels.fetch(this.settings.moderation.reports);
			if (channel && channel.isTextBased()) {
				const authorDisplayName = message.member?.displayName ?? message.author.displayName ?? message.author.username;
				const buffer = await generateRichPicture({
					type: RichPictureType.ReportMessage,
					data: {
						targetUsername: authorDisplayName,
						targetAvatarUrl: message.author.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
						reporterUsername: by ? ("displayName" in by && by.displayName ? (by.displayName as string) : ("user" in by ? by.user.username : undefined)) : undefined,
						reportType: "Message",
						reason: reason || "No reason provided",
						contentSnippet: message.content
					}
				});
				const attachment = new AttachmentBuilder(buffer, { name: "report_message.png" });

				await channel.send({ files: [attachment] });

				await message.forward(channel).catch(() => channel.send("> *Failed to forward the original message (likely due to NSFW restrictions).*\n> *Please use the target link above to view the message if it hasn't been deleted.*").catch(() => { }));

				await channel.send({
					components: [
						new ContainerBuilder()
							.addActionRowComponents((component) => component
								.addComponents([
									new ButtonBuilder()
										.setCustomId(`report:message:reply:${message.author.id}:${message.id}`)
										.setLabel("Reply")
										.setStyle(ButtonStyle.Primary),
									new ButtonBuilder()
										.setCustomId(`report:message:close:${message.id}`)
										.setLabel("Close report")
										.setStyle(ButtonStyle.Secondary),
								])
							)
							.addSeparatorComponents((component) => component
								.setSpacing(SeparatorSpacingSize.Small)
							)
							.addActionRowComponents((component) => component
								.addComponents([
									new ButtonBuilder()
										.setCustomId(`report:message:delete:${message.channelId}:${message.id}`)
										.setLabel("Delete message")
										.setStyle(ButtonStyle.Danger),
									new ButtonBuilder()
										.setCustomId(`report:message:warn:${message.author.id}:${message.id}`)
										.setLabel("Warn user")
										.setStyle(ButtonStyle.Danger),
									new ButtonBuilder()
										.setCustomId(`report:message:ban:${message.author.id}:${message.id}`)
										.setLabel("Ban user")
										.setStyle(ButtonStyle.Danger)
								])
							)
					],
					flags: MessageFlags.IsComponentsV2
				});
			} else this.reportError("Configured reports channel not found or not text-based", new Error(`Channel ID: ${this.settings.moderation.reports}`));
		} else this.#notifyOwnerFallback(`A message was reported in your server **${this.name}**${by ? ` by <@${by.user.id}>` : ""}:
Target: https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id} by <@${message.author.id}>
Reason: ${reason || "No reason provided"}`, "reports");
	}

	async reportUser(discordMember: GuildMember, by: GuildMember | APIInteractionGuildMember | null, reason?: string) {
		const moderationDirectory = path.join(this.#storagePath, "moderation", discordMember.id, "reports");

		await Deno.mkdir(moderationDirectory, {
			recursive: true
		});

		await Deno.writeTextFile(path.join(moderationDirectory, `${Date.now()}.json`), JSON.stringify({
			date: new Date().toISOString(),
			type: "User",
			user: discordMember.id,
			by: by?.user.id || null,
			reason
		}));

		if (this.settings.moderation.reports) {
			const channel = await this.#discordGuild.channels.fetch(this.settings.moderation.reports);
			if (channel && channel.isTextBased()) {
				const buffer = await generateRichPicture({
					type: RichPictureType.ReportUser,
					data: {
						targetUsername: discordMember.displayName,
						targetAvatarUrl: discordMember.user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
						reporterUsername: by ? ("displayName" in by && by.displayName ? (by.displayName as string) : ("user" in by ? by.user.username : undefined)) : undefined,
						reportType: "User",
						reason: reason || "No reason provided"
					}
				});
				const attachment = new AttachmentBuilder(buffer, { name: "report_user.png" });

				await channel.send({ files: [attachment] });

				await channel.send({
					components: [
						new ContainerBuilder()
							.addActionRowComponents((component) => component
								.addComponents([
									new ButtonBuilder()
										.setCustomId(`report:user:reply:${discordMember.id}`)
										.setLabel("Reply")
										.setStyle(ButtonStyle.Primary),
									new ButtonBuilder()
										.setCustomId(`report:user:close:${discordMember.id}`)
										.setLabel("Close report")
										.setStyle(ButtonStyle.Secondary),
								])
							)
							.addSeparatorComponents((component) => component
								.setSpacing(SeparatorSpacingSize.Small)
							)
							.addActionRowComponents((component) => component
								.addComponents([
									new ButtonBuilder()
										.setCustomId(`report:user:warn:${discordMember.id}`)
										.setLabel("Warn user")
										.setStyle(ButtonStyle.Danger),
									new ButtonBuilder()
										.setCustomId(`report:user:timeout:${discordMember.id}`)
										.setLabel("Timeout user")
										.setStyle(ButtonStyle.Danger)
								])
							)
					],
					flags: MessageFlags.IsComponentsV2
				});
			} else this.reportError("Configured reports channel not found or not text-based", new Error(`Channel ID: ${this.settings.moderation.reports}`));
		} else this.#notifyOwnerFallback(`A user was reported in your server **${this.name}**${by ? ` by <@${by.user.id}>` : ""}:
- Target: <@${discordMember.id}>
- Reason: ${reason || "No reason provided"}`, "reports");
	}

	async getModerationHistory(targetId: string) {
		const warnings: { date: string; reason: string; by: string | null }[] = [];
		const reports: ReportData[] = [];

		const warningsDir = path.join(this.#storagePath, "moderation", targetId, "warnings");
		try {
			for await (const entry of Deno.readDir(warningsDir)) {
				if (entry.isFile && entry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(warningsDir, entry.name));
					warnings.push(JSON.parse(content));
				}
			}
		} catch (_error) {
			// No warnings
		}

		const reportsDir = path.join(this.#storagePath, "moderation", targetId, "reports");
		try {
			for await (const entry of Deno.readDir(reportsDir)) {
				if (entry.isFile && entry.name.endsWith(".json")) {
					const content = await Deno.readTextFile(path.join(reportsDir, entry.name));
					reports.push(JSON.parse(content));
				}
			}
		} catch (_error) {
			// No reports
		}

		warnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return { warnings, reports };
	}

	reportError(message: string, error: unknown) {
		this.#logger.error(message, {
			cause: error
		});

		if (this.#settings.channels.logs) {
			const channel = this.#discordGuild.channels.cache.get(this.#settings.channels.logs);

			if (channel && channel.isTextBased()) return sendChunks(`An error occurred:
					\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``, channel.send.bind(channel)).catch(() => { });
		}

		this.#notifyOwnerFallback(`An error occurred in your server **${this.name}**:
\`\`\`
${String(message)}
${error instanceof Error ? error.stack : String(error)}
\`\`\``, "logs");
	}

	async publishFundingAnnouncement(userId: string, type: "boost" | "supporter"): Promise<boolean> {
		const channelId = this.settings.channels.supporters || this.settings.channels.bot || this.settings.channels.welcome;
		const channel = channelId ? this.#discordGuild.channels.cache.get(channelId) : this.#discordGuild.systemChannel;

		if (channel && channel.isTextBased()) {
			try {
				const discordMember = await this.#discordGuild.members.fetch(userId).catch(() => null);
				const username = discordMember ? discordMember.user.username : userId;
				const avatarUrl = discordMember ? discordMember.user.displayAvatarURL({ extension: "png", size: 256 }) : undefined;

				const buffer = await generateRichPicture({
					type: type === "boost" ? RichPictureType.Boost : RichPictureType.Supporter,
					data: {
						username,
						avatarUrl,
						type: type === "boost" ? "Boost" : "Supporter"
					}
				});
				const attachment = new AttachmentBuilder(buffer, { name: `${type}.png` });

				await channel.send({ content: `<@${userId}>`, files: [attachment] });
				return true;
			} catch (error) {
				this.reportError(`Failed to send announcement for ${userId}`, error);
				return false;
			}
		}
		return false;
	}

	async handleStickyMessage(message: Message) {
		const supportersChannelId = this.settings.channels.supporters;
		if (supportersChannelId && message.channelId === supportersChannelId) {
			if (!this.supportersStickyMessage) {
				this.supportersStickyMessage = new StickyMessage({
					storagePath: this.#storagePath,
					key: "supporters",
					getContent: async () => {
						const fundingCommandId = await client.getCommandId("funding", this.id);
						const commandText = fundingCommandId ? `</funding:${fundingCommandId}>` : "`/funding`";
						return `Hi! This channel is for displaying new server boosters and supporters that wants or wanted to support my creator's work!\n\nIf you want to support us, use the ${commandText} command to learn more!`;
					}
				});
				await this.supportersStickyMessage.init();
			}

			await this.supportersStickyMessage.handleMessage(message);
		}
	}
};