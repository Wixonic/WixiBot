import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	ai: {
		provider: "gemini",
		gemini: {
			enabled: true,
			model: "gemini-flash-lite-latest",
			apiKey: secrets.geminiApiKey || ""
		},
		lmstudio: {
			enabled: false,
			model: "qwen3.5-4b-mlx",
			baseUrl: "ws://127.0.0.1:1234"
		}
	},
	discord: {
		clientId: "1481997058708865104",
		invite: "https://discord.gg/2QB7QkPtrA",
		options: {},
		publicKey: "1456ca1215b0de8e3488737cc5bc6e872b22591e0a2dbbb425c28e83fec67c4b",
		roles: {
			booster: "1482062545894150174",
			supporter: "1482062568602243163"
		},
		sku: {
			funding: "1482063851505356870"
		},
		token: secrets.token,
		webhookUrl: secrets.webhookUrl
	},
	links: {
		funding: "https://discord.gg/2QB7QkPtrA",
		help: "https://discord.gg/wVHSFqG85J"
	}
};