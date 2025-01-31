const { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputStyle, TextInputBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");
const { Giveaway } = require("../lib/giveaways.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "giveawayEdit",
	args: 1,
	execute: async (interaction, args) => {
		const giveawayId = args[0];
		const giveawayPath = path.join(config.cache.giveaways, interaction.guildId, giveawayId + ".json");

		if (fs.existsSync(giveawayPath)) {
			const giveaway = Giveaway.get(interaction.guildId, giveawayId);

			const startsAt = new Date();
			if (typeof giveaway.startsAt == "number") startsAt.setTime(giveaway.startsAt);

			const endsAt = new Date(startsAt);
			endsAt.setUTCDate(startsAt.getUTCDate() + 1);
			if (typeof giveaway.endsAt == "number") endsAt.setTime(giveaway.endsAt);

			const gifts = [];
			for (const giftName in giveaway.gifts) gifts.push(giftName + " _ " + giveaway.gifts[giftName]);

			await interaction.showModal(
				new ModalBuilder()
					.setCustomId("giveawayEdit")
					.setTitle(`Giveaway ${giveaway.giveawayId}`)
					.setComponents(
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("id")
									.setLabel("Giveaway ID")
									.setMaxLength(giveaway.giveawayId.length)
									.setMinLength(giveaway.giveawayId.length)
									.setPlaceholder(giveaway.giveawayId)
									.setRequired(true)
									.setStyle(TextInputStyle.Short)
									.setValue(giveaway.giveawayId)
							),
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("startsAt")
									.setLabel("Starts at (UTC)")
									.setMaxLength(16)
									.setMinLength(16)
									.setPlaceholder("YYYY-MM-DD HH:mm")
									.setRequired(true)
									.setStyle(TextInputStyle.Short)
									.setValue(`${startsAt.getUTCFullYear()}-${String(startsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(startsAt.getUTCDate()).padStart(2, "0")} ${String(startsAt.getUTCHours()).padStart(2, "0")}:${String(startsAt.getUTCMinutes()).padStart(2, "0")}`)
							),
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("endsAt")
									.setLabel("Ends at (UTC)")
									.setMaxLength(16)
									.setMinLength(16)
									.setPlaceholder("YYYY-MM-DD HH:mm")
									.setRequired(true)
									.setStyle(TextInputStyle.Short)
									.setValue(`${endsAt.getUTCFullYear()}-${String(endsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(endsAt.getUTCDate()).padStart(2, "0")} ${String(endsAt.getUTCHours()).padStart(2, "0")}:${String(endsAt.getUTCMinutes()).padStart(2, "0")}`)
							),
						new ActionRowBuilder()
							.setComponents(
								new TextInputBuilder()
									.setCustomId("gifts")
									.setLabel("Gifts")
									.setPlaceholder("giftName _ winnerMessage; gift2Name _ winnerMessage; ...")
									.setRequired(true)
									.setStyle(TextInputStyle.Paragraph)
									.setValue(gifts.join("; "))
							)
					)
			);
		} else {
			interaction.log(`Giveaway file not found: ${giveawayId}`);
			await interaction.reply({
				content: "This giveaway does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
};