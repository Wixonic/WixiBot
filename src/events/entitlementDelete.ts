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

		if (!fundingSku || entitlement.skuId !== fundingSku) return;

		const discordClient = client.discord;
		if (!discordClient) {
			logger.warn("Skipped entitlement cleanup: Discord client unavailable.");
			return;
		}

		const supporterRoleId = settings.discord.roles.supporter;
		if (!supporterRoleId) {
			logger.warn("Skipped entitlement cleanup: supporter role is not configured.");
			return;
		}

		let discordGuild = entitlement.guildId ? await discordClient.guilds.fetch(entitlement.guildId).catch(() => null) : null;

		if (!discordGuild) {
			for (const guild of discordClient.guilds.cache.values()) {
				const role = await guild.roles.fetch(supporterRoleId).catch(() => null);

				if (role) {
					discordGuild = guild;
					break;
				}
			}
		}

		if (discordGuild) {
			const member = await discordGuild.members.fetch(entitlement.userId).catch(() => null);

			if (member) {
				try {
					await member.roles.remove(supporterRoleId, "Funding entitlement removed");
					logger.info(`Removed supporter role from ${entitlement.userId} in guild ${discordGuild.id}.`);
				} catch (error) {
					logger.error(`Failed to remove supporter role from ${entitlement.userId}`, {
						cause: error
					});
				}
				return;
			}
		}

		const user = await discordClient.users.fetch(entitlement.userId).catch(() => null);
		if (!user) {
			logger.warn(`Could not fetch user ${entitlement.userId} after funding removal.`);
			return;
		}

		try {
			await user.send(`Your supporter perks were removed because your funding has ended.
			You can renew support here: ${settings.links?.funding ?? "<https://go.wixonic.fr/funding>"}`);
			logger.info(`Sent funding renewal DM to ${entitlement.userId} after funding removal.`);
		} catch (error) {
			logger.error(`Failed to DM ${entitlement.userId} after funding removal.`, {
				cause: error
			});
		}
	}
};