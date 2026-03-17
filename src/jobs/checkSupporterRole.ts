import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const job: Job = {
	cron: "0 0 * * *",
	name: "Check Supporter Role",
	async execute(logger: Logger) {
		const settings = getSettings();
		const fundingSku = settings.discord.sku.funding;
		const supporterRoleId = settings.discord.roles.supporter;

		if (fundingSku && supporterRoleId && client.discord) {
			logger.debug("Running daily supporter role check...");

			let checked = 0;
			let removed = 0;

			for (const guild of client.discord.guilds.cache.values()) {
				let members;
				try {
					members = await guild.members.fetch();
				} catch (error) {
					logger.error(`Failed to fetch members for guild ${guild.id}`, {
						cause: error
					});
					continue;
				}

				const supporters = members.filter((member) => member.roles.cache.has(supporterRoleId));

				for (const member of supporters.values()) {
					checked++;

					let entitlements;
					try {
						entitlements = await client.discord.application?.entitlements.fetch({
							user: member.id
						});
					} catch (error) {
						logger.error(`Failed to fetch entitlements for ${member.id}`, {
							cause: error
						});
						continue;
					}

					const hasActive = entitlements?.some(
						(entitlement) => entitlement.skuId === fundingSku && entitlement.isActive()
					);

					if (hasActive) continue;

					try {
						await member.roles.remove(supporterRoleId, "Funding entitlement no longer active");
						logger.info(`Removed supporter role from ${member.id} in guild ${guild.id}.`);
						removed++;
					} catch (error) {
						logger.error(`Failed to remove supporter role from ${member.id} in guild ${guild.id}`, {
							cause: error
						});
					}
				}
			}

			logger.info(`Daily supporter role check complete: ${checked} checked, ${removed} removed.`);
		} else logger.warn("Skipped supporter role check: Discord client unavailable.");
	}
};