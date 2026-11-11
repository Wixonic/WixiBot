import { Events, type Entitlement } from "discord.js";

import type { Logger } from "../lib/logger.ts";
import { handleFundingEntitlementEnded } from "../lib/entitlement.ts";

export const event = {
	type: Events.EntitlementUpdate,
	once: false,

	async execute(logger: Logger, entitlement: Entitlement) {
		if (entitlement.isActive()) return;

		await handleFundingEntitlementEnded(logger, entitlement);
	}
};