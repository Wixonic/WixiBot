import { AttachmentBuilder, Events, type GuildMember } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { getSettings } from "../lib/settings.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";

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
					const user = await client.getUser(discordMember.id);
					const buffer = await generateRichPicture({
						type: RichPictureType.WelcomeMember,
						data: {
							username: discordMember.displayName,
							avatarUrl: user?.avatar("webp", 256, false) ?? discordMember.user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true }),
							avatarDecorationUrl: user?.avatarDecoration(false) ?? undefined,
							displayNameStyle: await user?.displayNameStyle(),
							serverName: discordMember.guild.name,
							memberCount: discordMember.guild.memberCount
						}
					});
					const attachment = new AttachmentBuilder(buffer, { name: "welcome.png" });
					await channel.send({ content: `<@${discordMember.id}>, welcome to the server!`, files: [attachment] });
				} catch (error) {
					logger.error(`Failed to send welcome message to ${discordMember.guild.id}`, { cause: error });
				}
			}
		}
	}
};