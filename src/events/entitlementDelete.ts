import { Events, type Entitlement } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const event = {
	type: Events.EntitlementDelete,
	once: false,

	async execute(logger: Logger, entitlement: Entitlement) {
		const settings = getSettings();
		const fundingSku = settings.discord.sku.funding;

		if (fundingSku && entitlement.skuId === fundingSku) {
			if (entitlement.guildId) {
				const discordGuild = await client.discord?.guilds.fetch(entitlement.guildId).catch(() => null);

				if (discordGuild) {
					const member = await discordGuild.members.fetch(entitlement.userId).catch(() => null);

					if (member) {
						try {
							await member.roles.remove(settings.discord.roles.supporter, "Funding entitlement removed");
							logger.info(`Removed supporter role from ${entitlement.userId} in guild ${discordGuild.id}.`);
						} catch (error) {
							logger.error(`Failed to remove supporter role from ${entitlement.userId}`, {
								cause: error
							});
						}
						return;
					} else logger.warn(`Skipped supporter role cleanup for ${entitlement.userId}: entitlement guild ${entitlement.guildId} not found (sku: ${entitlement.skuId}).`);
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
			} else logger.warn(`Skipped supporter role cleanup for ${entitlement.userId}: missing entitlement guild ID (sku: ${entitlement.skuId}).`);
		}
	}
};