import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	ai: {
		apiKey: secrets.ai?.apiKey,
		baseURL: "http://127.0.0.1:8888",
		models: {
			default: "unsloth/gemma-4-E2B-it-qat-GGUF:UD-Q4_K_XL"
		}
	},
	discord: {
		clientId: "1481288839250182304",
		invite: "https://discord.gg/BcXFAVKJZQ",
		options: {},
		publicKey: "fd9e008cca4da07f95dda81cc8f0f6a9e2ba621edd6598ccb90e2cbce1588324",
		roles: {
			supporter: "1483120012297375868"
		},
		sku: {
			funding: "1483116808193183765"
		},
		token: secrets.token,
		webhookUrl: secrets.webhookUrl
	},
	links: {
		funding: "https://discord.gg/2QB7QkPtrA",
		help: "https://discord.gg/wVHSFqG85J"
	}
};