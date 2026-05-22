import { Events, type GuildMember } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";

export const event = {
	type: Events.GuildMemberAdd,
	once: false,

	async execute(logger: Logger, discordMember: GuildMember) {
		const settings = getSettings();
		const fundingSku = settings.discord.sku.funding;
		const supporterRoleId = settings.discord.roles.supporter;

		if (fundingSku && supporterRoleId) {
			logger.debug(`Checking entitlements for ${discordMember.id} on join in guild ${discordMember.guild.id}.`);

			const entitlements = await discordMember.client.application.entitlements.fetch({
				user: discordMember.id
			});

			if (entitlements.some((entitlement) => entitlement.skuId === fundingSku && entitlement.isActive())) {
				try {
					await discordMember.roles.add(supporterRoleId, "Funding entitlement active on join");
					logger.info(`Assigned supporter role to ${discordMember.id} on join in guild ${discordMember.guild.id}.`);
				} catch (error) {
					logger.error(`Failed to assign supporter role to ${discordMember.id} on join`, {
						cause: error
					});
				}
			}
		}

		const guild = await client.getGuild(discordMember.guild.id);
		if (guild && guild.settings.channels.welcome) {
			const channel = await discordMember.guild.channels.fetch(guild.settings.channels.welcome);
			if (channel && channel.isTextBased()) {
				try {
					await channel.send(`<@${discordMember.id}> joined the server.`);
				} catch (error) {
					logger.error(`Failed to send welcome message to ${discordMember.guild.id}`, { cause: error });
				}
			}
		}
	}
};