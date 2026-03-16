import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	ai: {
		enabled: true,
		model: "qwen3.5-4b-mlx",
		maxTokens: 512
	},
	discord: {
		clientId: "1481997058708865104",
		options: {},
		publicKey: "cce0d2008060481b589e8d8a7c4ef73dd5278aab48a23f37f72ee94887469638",
		roles: {
			booster: "1040743271288295436",
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
		help: "https://discord.gg/wVHSFqG85J",
		join: "https://discord.gg/BcXFAVKJZQ"
	}
};