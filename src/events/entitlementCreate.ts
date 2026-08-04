import { Events, type Entitlement, ActionRowBuilder, ButtonBuilder, ButtonStyle, type Guild } from "discord.js";

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
			const guilds: Guild[] = [];
			if (entitlement.guildId) {
				const discordGuild = await client.discord?.guilds.fetch(entitlement.guildId).catch(() => null);
				if (discordGuild) guilds.push(discordGuild);
			} else if (client.discord) {
				guilds.push(...client.discord.guilds.cache.values());
			}

			let memberFound = false;

			for (const discordGuild of guilds) {
				const member = await discordGuild.members.fetch(entitlement.userId).catch(() => null);

				if (member) {
					memberFound = true;
					try {
						await member.roles.add(settings.discord.roles.supporter, "Purchased funding SKU");
						logger.info(`Assigned supporter role to ${entitlement.userId} in guild ${discordGuild.id}.`);
					} catch (error) {
						logger.error(`Failed to assign supporter role to ${entitlement.userId} in guild ${discordGuild.id}`, {
							cause: error
						});
					}

					const user = await client.getUser(entitlement.userId);
					if (user && user.data.announceFunding !== undefined) {
						if (user.data.announceFunding === true) {
							const guild = await client.getGuild(discordGuild.id);
							await guild?.publishFundingAnnouncement(entitlement.userId, "supporter");
						}
						continue;
					}

					try {
						const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId(`announce:supporter:yes:${discordGuild.id}`)
								.setLabel("Yes, announce publicly")
								.setStyle(ButtonStyle.Success),
							new ButtonBuilder()
								.setCustomId(`announce:supporter:no:${discordGuild.id}`)
								.setLabel("No, keep it private")
								.setStyle(ButtonStyle.Secondary)
						);

						await member.send({
							content: `Thank you for supporting my creator! Would you like us to announce it publicly on the server?`,
							components: [row]
						});
					} catch (error) {
						logger.error(`Failed to send supporter announcement permission DM to ${entitlement.userId}`, {
							cause: error
						});
					}
				}
			}

			if (!memberFound) {
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
			}
		}
	}
};