const { ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const Giveaway = require("../lib/giveaways.js");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Edit Giveaway",
	id: "editGiveaway",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, giveawayId) => {
		logger.debug(giveawayId);
		const giveaway = Giveaway.get(logger, bot, giveawayId);

		const startsAt = new Date();
		if (typeof giveaway.startsAt === "number") startsAt.setTime(giveaway.startsAt);

		const endsAt = new Date(startsAt);
		endsAt.setUTCDate(startsAt.getUTCDate() + 1);
		if (typeof giveaway.endsAt === "number") endsAt.setTime(giveaway.endsAt);

		const gifts = [];
		const notes = [];
		for (const gift of giveaway.gifts) {
			gifts.push(gift.name + " _ " + gift.secret);
			notes.push(gift.note);
		}

		await interaction.showModal(
			new ModalBuilder()
				.setCustomId("editGiveaway")
				.setTitle(`Giveaway ${giveaway.id}`)
				.setComponents(
					new ActionRowBuilder()
						.setComponents(
							new TextInputBuilder()
								.setCustomId("id")
								.setLabel("Giveaway ID")
								.setPlaceholder(giveaway.id)
								.setRequired(true)
								.setStyle(TextInputStyle.Short)
								.setMinLength(giveaway.id.length)
								.setMaxLength(giveaway.id.length)
								.setValue(giveaway.id)
						),
					new ActionRowBuilder()
						.setComponents(
							new TextInputBuilder()
								.setCustomId("startsAt")
								.setLabel("Starts at (UTC)")
								.setPlaceholder("YYYY-MM-DD HH:mm")
								.setRequired(true)
								.setStyle(TextInputStyle.Short)
								.setMinLength(16)
								.setMaxLength(16)
								.setValue(`${startsAt.getUTCFullYear()}-${String(startsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(startsAt.getUTCDate()).padStart(2, "0")} ${String(startsAt.getUTCHours()).padStart(2, "0")}:${String(startsAt.getUTCMinutes()).padStart(2, "0")}`)
						),
					new ActionRowBuilder()
						.setComponents(
							new TextInputBuilder()
								.setCustomId("endsAt")
								.setLabel("Ends at (UTC)")
								.setPlaceholder("YYYY-MM-DD HH:mm")
								.setRequired(true)
								.setStyle(TextInputStyle.Short)
								.setMinLength(16)
								.setMaxLength(16)
								.setValue(`${endsAt.getUTCFullYear()}-${String(endsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(endsAt.getUTCDate()).padStart(2, "0")} ${String(endsAt.getUTCHours()).padStart(2, "0")}:${String(endsAt.getUTCMinutes()).padStart(2, "0")}`)
						),
					new ActionRowBuilder()
						.setComponents(
							new TextInputBuilder()
								.setCustomId("gifts")
								.setLabel("Gifts")
								.setPlaceholder("name _ secret; name _ secret; ...")
								.setRequired(true)
								.setStyle(TextInputStyle.Paragraph)
								.setValue(gifts.join("; "))
						),
					new ActionRowBuilder()
						.setComponents(
							new TextInputBuilder()
								.setCustomId("notes")
								.setLabel("Notes")
								.setPlaceholder("note1; note2; ...")
								.setRequired(true)
								.setStyle(TextInputStyle.Paragraph)
								.setValue(notes.join("; "))
						)
				)
				.toJSON()
		);
	}
};

module.exports = component;