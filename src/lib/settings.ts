import type { ClientOptions } from "discord.js";
import index from "../settings/index.json" with { type: "json" };

export interface AISettings {
	apiKey: string;
	baseURL: string;
	models: {
		default: string;
		deep_research?: string;
		summary?: string;
	};
};

export interface DiscordSkuSettings {
	funding?: string;
};

export interface DiscordSettings {
	clientId: string;
	invite?: string;
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

	if (clientId) {
		try {
			const { settings } = await import(`../settings/${clientId}/main.ts`);
			current = settings as ClientSettings;
			return current;
		} catch (error) {
			throw new Error(`Failed to load settings for ${currentClient} client`, {
				cause: error
			});
		}
	} else throw new Error(`Client "${currentClient}" not found in index.json`);
};

const getSettings = (): ClientSettings => {
	if (current) return current;
	else throw new Error("Settings not loaded. Call loadSettings() first.");
};

export { loadSettings, getSettings };