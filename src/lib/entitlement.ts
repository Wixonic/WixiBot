import type { Entitlement } from "discord.js";

import { client } from "./client.ts";
import type { Logger } from "./logger.ts";
import { getSettings } from "./settings.ts";

export const handleFundingEntitlementEnded = async (logger: Logger, entitlement: Entitlement): Promise<void> => {
	const settings = getSettings();
	const fundingSku = settings.discord.sku.funding;
	const supporterRoleId = settings.discord.roles.supporter;

	if (!fundingSku || !supporterRoleId || entitlement.skuId !== fundingSku) return;

	const guilds = [];
	if (entitlement.guildId) {
		const discordGuild = await client.discord?.guilds.fetch(entitlement.guildId).catch(() => null);
		if (discordGuild) guilds.push(discordGuild);
	} else if (client.discord) {
		guilds.push(...client.discord.guilds.cache.values());
	}

	for (const discordGuild of guilds) {
		const member = await discordGuild.members.fetch(entitlement.userId).catch(() => null);

		if (member) {
			try {
				await member.roles.remove(supporterRoleId, "Funding entitlement removed");
				logger.info(`Removed supporter role from ${entitlement.userId} in guild ${discordGuild.id}.`);
			} catch (error) {
				logger.error(`Failed to remove supporter role from ${entitlement.userId} in guild ${discordGuild.id}`, {
					cause: error
				});
			}
		}
	}

	const user = await client.discord?.users.fetch(entitlement.userId).catch(() => null);
	if (user) {
		try {
			await user.send(`Your supporter perks were removed because your funding has ended.
You can renew support here: ${settings.links?.funding ?? "<https://go.wixonic.fr/funding>"}`);
			logger.info(`Sent funding renewal DM to ${entitlement.userId} after funding removal.`);
		} catch (error) {
			logger.error(`Failed to DM ${entitlement.userId} after funding removal.`, {
				cause: error
			});
		}
	} else logger.warn(`Could not fetch user ${entitlement.userId} after funding removal.`);
};