const { MessageFlags } = require("discord.js");

const fs = require("fs");

const Giveaway = require("../lib/giveaways.js");

/**
 * @type {import("../types.js").ModalInfo}
 */
const modal = {
	name: "Edit Giveaway",
	id: "editGiveaway",
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveawayId = interaction.fields.getTextInputValue("id");
		const giveawayPath = bot.settings.paths.giveaway(interaction.guild.id, giveawayId);

		if (fs.existsSync(giveawayPath)) {
			const startsAt = new Date(interaction.fields.getTextInputValue("startsAt") + " UTC");
			const endsAt = new Date(interaction.fields.getTextInputValue("endsAt") + " UTC");
			const textGifts = interaction.fields.getTextInputValue("gifts").split("; ");

			const gifts = [];
			for (const textGift of textGifts) gifts.push({
				name: textGift.split(" _ ")[0],
				secret: textGift.split(" _ ")[1]
			});

			const giveaway = Giveaway.get(interaction.guildId, bot, giveawayId);
			giveaway.startsAt = startsAt.getTime();
			giveaway.endsAt = endsAt.getTime();
			giveaway.gifts = gifts;
			await giveaway.save();

			await interaction.followUp(`Giveaway successfully updated.\n-# Giveaway ${giveaway.id}`);
		} else {
			logger.debug(`Giveaway file not found: ${giveawayId}`);
			await interaction.followUp("This giveaway does not exist anymore.");
		}
	}
};

module.exports = modal;