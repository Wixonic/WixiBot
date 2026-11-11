import { Events, type Entitlement } from "discord.js";

import type { Logger } from "../lib/logger.ts";
import { handleFundingEntitlementEnded } from "../lib/entitlement.ts";

export const event = {
	type: Events.EntitlementDelete,
	once: false,

	async execute(logger: Logger, entitlement: Entitlement) {
		await handleFundingEntitlementEnded(logger, entitlement);
	}
};