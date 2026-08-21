import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	ai: {
		enabled: false,
		apiKey: secrets.ai?.apiKey,
		baseURL: "http://127.0.0.1:8888",
		models: {
			default: "unsloth/gemma-4-E2B-it-qat-GGUF:UD-Q4_K_XL"
		}
	},
	discord: {
		clientId: "1481997058708865104",
		primaryGuildId: "1020663521530351627",
		invite: "https://discord.gg/BcXFAVKJZQ",
		options: {},
		publicKey: "1456ca1215b0de8e3488737cc5bc6e872b22591e0a2dbbb425c28e83fec67c4b",
		roles: {
			supporter: "1483085157572284549"
		},
		sku: {
			funding: "1483114250791817310"
		},
		token: secrets.token,
		webhookUrl: secrets.webhookUrl
	},
	links: {
		funding: "https://discord.gg/2QB7QkPtrA",
		help: "https://discord.gg/wVHSFqG85J"
	},
	storage: {
		maxCapacity: 180 * 1024 * 1024 * 1024
	}
};