import type { ClientSettings } from "../../lib/settings.ts";
import { secrets } from "./secrets.ts";

export const settings: ClientSettings = {
	discord: {},
	clientId: "1481288839250182304",
	publicKey: "fd9e008cca4da07f95dda81cc8f0f6a9e2ba621edd6598ccb90e2cbce1588324",
	token: secrets.token,
	webhookUrl: secrets.webhookUrl
};