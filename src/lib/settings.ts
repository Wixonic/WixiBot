import type { ClientOptions } from "discord.js";
import index from "../settings/index.json" with { type: "json" };

export interface AISettings {
	enabled: boolean;
	model: string;
	maxTokens: number;
};

export interface DiscordSkuSettings {
	funding?: string;
};

export interface DiscordSettings {
	clientId: string;
	options: Omit<ClientOptions, "intents">;
	publicKey: string;
	roles: Record<string, string>;
	sku: DiscordSkuSettings;
	token: string;
	webhookUrl: URL;
};

export interface ClientLinksSettings {
	funding?: string;
	help?: string;
	join?: string;
};

export interface ClientSettings {
	ai?: AISettings;
	discord: DiscordSettings;
	links?: ClientLinksSettings;
};

export type ClientType = keyof typeof index;

let current: ClientSettings | null = null;
let currentClient: ClientType = "prod";

const loadSettings = async (client?: ClientType): Promise<ClientSettings> => {
	if (client) currentClient = client;
	const clientId = index[currentClient];

	if (!clientId) throw new Error(`Client "${currentClient}" not found in index.json`);

	try {
		const { settings } = await import(`../settings/${clientId}/main.ts`);
		current = settings as ClientSettings;
		return current;
	} catch (e) {
		throw new Error(`Failed to load settings for ${currentClient} client`, {
			cause: e
		});
	}
};

const getSettings = (): ClientSettings => {
	if (!current) throw new Error("Settings not loaded. Call loadSettings() first.");
	return current;
};

export { loadSettings, getSettings };