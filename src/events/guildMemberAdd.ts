import { Events, type GuildMember } from "discord.js";

import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const event = {
	type: Events.GuildMemberAdd,
	once: false,

	async execute(logger: Logger, member: GuildMember) {
		const settings = getSettings();
		const fundingSku = settings.discord.sku.funding;
		const supporterRoleId = settings.discord.roles.supporter;

		if (fundingSku && supporterRoleId) {
			logger.debug(`Checking entitlements for ${member.id} on join in guild ${member.guild.id}.`);

			const entitlements = await member.client.application.entitlements.fetch({
				user: member.id
			});

			if (entitlements.some((entitlement) => entitlement.skuId === fundingSku && entitlement.isActive())) {
				try {
					await member.roles.add(supporterRoleId, "Funding entitlement active on join");
					logger.info(`Assigned supporter role to ${member.id} on join in guild ${member.guild.id}.`);
				} catch (error) {
					logger.error(`Failed to assign supporter role to ${member.id} on join`, {
						cause: error
					});
				}
			}
		}
	}
};