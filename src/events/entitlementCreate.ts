import { Events, type Entitlement } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const event = {
	type: Events.EntitlementCreate,
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
							await member.roles.add(settings.discord.roles.supporter, "Purchased funding SKU");
							logger.info(`Assigned supporter role to ${entitlement.userId} in guild ${discordGuild.id}.`);
						} catch (error) {
							logger.error(`Failed to assign supporter role to ${entitlement.userId}`, {
								cause: error
							});
						}
						return;
					} else logger.warn(`Skipped supporter role assignment for ${entitlement.userId}: entitlement guild ${entitlement.guildId} not found (sku: ${entitlement.skuId}).`);
				}

				const user = await client.discord?.users.fetch(entitlement.userId).catch(() => null);
				if (user) {
					try {
						await user.send(`Thanks for supporting my creator!
To unlock all supporter perks, please join the Discord server: ${settings.discord.invite ?? "<https://go.wixonic.fr/discord>"}`);
						logger.info(`Sent join - server DM to ${entitlement.userId} after funding purchase.`);
					} catch (error) {
						logger.error(`Failed to DM ${entitlement.userId} after funding purchase.`, {
							cause: error
						});
					}
				} else logger.warn(`Could not fetch user ${entitlement.userId} after funding purchase.`);
			} else logger.warn(`Skipped supporter role assignment for ${entitlement.userId}: missing entitlement guild ID (sku: ${entitlement.skuId}).`);
		}
	}
};