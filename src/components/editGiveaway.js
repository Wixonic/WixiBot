const { ComponentType, TextInputStyle } = require("discord.js");

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
		if (typeof giveaway.startsAt == "number") startsAt.setTime(giveaway.startsAt);

		const endsAt = new Date(startsAt);
		endsAt.setUTCDate(startsAt.getUTCDate() + 1);
		if (typeof giveaway.endsAt == "number") endsAt.setTime(giveaway.endsAt);

		const gifts = [];
		for (const gift of giveaway.gifts) gifts.push(gift.name + " _ " + gift.secret);

		/**
		 * @type {import("discord.js").APIModalInteractionResponseCallbackData}
		 */
		const modal = {
			custom_id: "editGiveaway",
			title: `Giveaway ${giveaway.id}`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "id",
							label: "Giveaway ID",
							max_length: giveaway.id.length,
							min_length: giveaway.id.length,
							placeholder: giveaway.id,
							required: true,
							style: TextInputStyle.Short,
							value: giveaway.id
						}
					]
				}, {
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "startsAt",
							label: "Starts at (UTC)",
							max_length: 16,
							min_length: 16,
							placeholder: "YYYY-MM-DD HH:mm",
							required: true,
							style: TextInputStyle.Short,
							value: `${startsAt.getUTCFullYear()}-${String(startsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(startsAt.getUTCDate()).padStart(2, "0")} ${String(startsAt.getUTCHours()).padStart(2, "0")}:${String(startsAt.getUTCMinutes()).padStart(2, "0")}`
						}
					]
				}, {
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "endsAt",
							label: "Ends at (UTC)",
							max_length: 16,
							min_length: 16,
							placeholder: "YYYY-MM-DD HH:mm",
							required: true,
							style: TextInputStyle.Short,
							value: `${endsAt.getUTCFullYear()}-${String(endsAt.getUTCMonth() + 1).padStart(2, "0")}-${String(endsAt.getUTCDate()).padStart(2, "0")} ${String(endsAt.getUTCHours()).padStart(2, "0")}:${String(endsAt.getUTCMinutes()).padStart(2, "0")}`
						}
					]
				}, {
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "gifts",
							label: "Gifts",
							placeholder: "name _ secret; name _ secret; ...",
							required: true,
							style: TextInputStyle.Paragraph,
							value: gifts.join("; ")
						}
					]
				}
			]
		};

		await interaction.showModal(modal);
	}
};

module.exports = component;