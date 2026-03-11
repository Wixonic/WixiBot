import index from "../settings/index.json" with { type: "json" };

export interface ClientSettings {
	clientId: string;
	publicKey: string;
	token: string;
	webhookUrl: string;
};

export type ClientName = keyof typeof index;

let current: ClientSettings | null = null;
let currentClient: ClientName = "default";

const loadSettings = async (client?: ClientName): Promise<ClientSettings> => {
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