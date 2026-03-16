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

		if (!fundingSku || entitlement.skuId !== fundingSku) return;

		const discordClient = client.discord;
		if (!discordClient) {
			logger.warn("Skipped entitlement handling: Discord client unavailable.");
			return;
		}

		const supporterRoleId = settings.discord.roles.supporter;
		if (!supporterRoleId) {
			logger.warn("Skipped entitlement handling: supporter role is not configured.");
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
					await member.roles.add(supporterRoleId, "Purchased funding SKU");
					logger.info(`Assigned supporter role to ${entitlement.userId} in guild ${discordGuild.id}.`);
				} catch (error) {
					logger.error(`Failed to assign supporter role to ${entitlement.userId}`, {
						cause: error
					});
				}
				return;
			}
		}

		const user = await discordClient.users.fetch(entitlement.userId).catch(() => null);
		if (!user) {
			logger.warn(`Could not fetch user ${entitlement.userId} after funding purchase.`);
			return;
		}

		try {
			await user.send(`Thanks for supporting my creator!
To unlock all supporter perks, please join the Discord server: ${settings.links?.join ?? "<https://go.wixonic.fr/discord>"}`);
			logger.info(`Sent join - server DM to ${entitlement.userId} after funding purchase.`);
		} catch (error) {
			logger.error(`Failed to DM ${entitlement.userId} after funding purchase.`, {
				cause: error
			});
		}
	}
};