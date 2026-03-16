import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	ai: {
		enabled: true,
		model: "qwen3.5-4b-mlx",
		maxTokens: 512
	},
	discord: {},
	clientId: "1481997058708865104",
	publicKey: "cce0d2008060481b589e8d8a7c4ef73dd5278aab48a23f37f72ee94887469638",
	token: secrets.token,
	webhookUrl: secrets.webhookUrl
};