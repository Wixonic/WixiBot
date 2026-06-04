import { Events, type GuildMember, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const event = {
	type: Events.GuildMemberUpdate,
	once: false,

	async execute(logger: Logger, oldMember: GuildMember, newMember: GuildMember) {
		if (!oldMember.premiumSince && newMember.premiumSince) {
			logger.info(`User ${newMember.id} started boosting guild ${newMember.guild.id}. Asking for announcement permission.`);

			const user = await client.getUser(newMember.id);
			if (user && user.data.announceFunding !== undefined) {
				if (user.data.announceFunding === true) {
					const guild = await client.getGuild(newMember.guild.id);
					await guild?.publishFundingAnnouncement(newMember.id, "boost");
				}
				return;
			}

			try {
				const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(`announce:boost:yes:${newMember.guild.id}`)
						.setLabel("Yes, announce publicly")
						.setStyle(ButtonStyle.Success),
					new ButtonBuilder()
						.setCustomId(`announce:boost:no:${newMember.guild.id}`)
						.setLabel("No, keep it private")
						.setStyle(ButtonStyle.Secondary)
				);

				await newMember.send({
					content: `Thank you for boosting **${newMember.guild.name}**! Would you like us to announce it publicly on the server?`,
					components: [row]
				});
			} catch (error) {
				logger.error(`Failed to send boost announcement permission DM to ${newMember.id}`, {
					cause: error
				});
			}
		}
	}
};
