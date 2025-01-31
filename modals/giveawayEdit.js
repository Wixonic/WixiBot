const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { Giveaway } = require("../lib/giveaways.js");

const config = require("../config.js");

/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "giveawayEdit",
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveawayId = interaction.fields.getTextInputValue("id");
		const giveawayPath = path.join(config.cache.giveaways, interaction.guildId, giveawayId + ".json");

		if (fs.existsSync(giveawayPath)) {
			const startsAt = new Date(interaction.fields.getTextInputValue("startsAt") + " UTC");
			const endsAt = new Date(interaction.fields.getTextInputValue("endsAt") + " UTC");
			const textGifts = interaction.fields.getTextInputValue("gifts").split("; ");

			const gifts = {};
			for (const textGift of textGifts) gifts[textGift.split(" _ ")[0]] = textGift.split(" _ ")[1];

			const giveaway = Giveaway.get(interaction.guildId, giveawayId);
			giveaway.startsAt = startsAt.getTime();
			giveaway.endsAt = endsAt.getTime();
			giveaway.gifts = gifts;
			await giveaway.save();

			await interaction.editReply({
				content: `Giveaway successfully updated.\n-# Giveaway ${giveaway.giveawayId}`,
				flags: MessageFlags.Ephemeral
			});
		} else {
			interaction.log(`Giveaway file not found: ${giveawayId}`);
			await interaction.reply({
				content: "This giveaway does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
};