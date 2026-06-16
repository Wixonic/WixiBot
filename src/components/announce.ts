import type { MessageComponentInteraction } from "discord.js";
import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const component = {
	customId: "announce",

	async execute(_logger: Logger, interaction: MessageComponentInteraction, type: string, action: string, guildId: string) {
		const user = await client.getUser(interaction.user.id);
		if (user) {
			user.data.announceFunding = action === "yes";
			await user.saveData();
		}

		if (action === "no") {
			await interaction.update({
				content: "No problem, we'll keep it private. Thank you again for your support!",
				components: []
			});
			return;
		}

		if (action === "yes") {
			const guild = await client.getGuild(guildId);
			if (!guild) {
				await interaction.update({
					content: "Failed to find the server. We couldn't publish the announcement.\nPlease ask staff [here](https://go.wixonic.fr/support) if you want your announcement to be published!",
					components: []
				});
				return;
			}

			const success = await guild.publishFundingAnnouncement(interaction.user.id, type as "boost" | "supporter");

			if (success) {
				await interaction.update({
					content: "The announcement has been published successfully! Thank you again.",
					components: []
				});
			} else {
				await interaction.update({
					content: "The server doesn't have an announcement channel configured yet, or an error occurred.",
					components: []
				});
			}
		}
	}
};
