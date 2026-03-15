import type { ClientOptions } from "discord.js";
import index from "../settings/index.json" with { type: "json" };

export interface AISettings {
	enabled: boolean;
	model: string;
	maxTokens: number;
};

export interface ClientSettings {
	ai?: AISettings;
	discord: Omit<ClientOptions, "intents">;
	clientId: string;
	publicKey: string;
	token: string;
	webhookUrl: URL;
};

export type ClientType = keyof typeof index;

let current: ClientSettings | null = null;
let currentClient: ClientType = "default";

const loadSettings = async (client?: ClientType): Promise<ClientSettings> => {
	if (client) currentClient = client;
	const clientId = index[currentClient];

	try {
		const { settings } = await import(`../settings/${clientId}/main.ts`);
		current = settings as ClientSettings;
		return current;
	} catch (e) {
		throw new Error(`Failed to load settings for ${client} client`, {
			cause: e
		});
	}
};

const getSettings = (): ClientSettings => {
	if (!current) throw new Error("Settings not loaded. Call loadSettings() first.");
	return current;
};

export { loadSettings, getSettings };