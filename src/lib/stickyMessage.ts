import type { Message } from "discord.js";
import path from "node:path";

export type StickyContent = string | { content?: string;[key: string]: unknown };

export interface StickyMessageOptions {
	storagePath: string;
	key: string;
	getContent: () => StickyContent | Promise<StickyContent>;
};

export class StickyMessage {
	private storagePath: string;
	private key: string;
	private getContent: () => StickyContent | Promise<StickyContent>;
	private lastStickyMessageId: string | null = null;
	private isLocked = false;

	constructor(options: StickyMessageOptions) {
		this.storagePath = options.storagePath;
		this.key = options.key;
		this.getContent = options.getContent;
	};

	async init() {
		try {
			const filePath = path.join(this.storagePath, `sticky_${this.key}.json`);
			const content = await Deno.readTextFile(filePath);
			this.lastStickyMessageId = JSON.parse(content).id ?? null;
		} catch {
			this.lastStickyMessageId = null;
		}
	};

	private async saveId(id: string | null) {
		this.lastStickyMessageId = id;
		const filePath = path.join(this.storagePath, `sticky_${this.key}.json`);
		await Deno.mkdir(this.storagePath, { recursive: true }).catch(() => null);
		await Deno.writeTextFile(filePath, JSON.stringify({ id })).catch(() => null);
	};

	async handleMessage(message: Message) {
		if (message.id === this.lastStickyMessageId) return;
		if (this.isLocked) return;

		this.isLocked = true;

		try {
			const channel = message.channel;
			if (!channel.isSendable()) return;

			if (this.lastStickyMessageId) {
				await channel.messages.delete(this.lastStickyMessageId).catch(() => null);
				await this.saveId(null);
			}

			const payload = await this.getContent();
			const messageOptions = typeof payload === "string" ? { content: payload } : payload;

			const newSticky = await channel.send(messageOptions);
			await this.saveId(newSticky.id);
		} catch {
			// Ignore error
		} finally {
			this.isLocked = false;
		}
	};
};