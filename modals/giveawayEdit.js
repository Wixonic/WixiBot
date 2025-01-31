/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "giveawayEdit",
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		// Edit giveaways
	}
};