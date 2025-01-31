const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "giveawayDelete",
	args: 1,
	execute: async (interaction, args) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveawayId = args[0];
		const giveawayPath = path.join(config.cache.giveaways, interaction.guildId, giveawayId + ".json");

		if (fs.existsSync(giveawayPath)) {
			try {
				fs.rmSync(giveawayPath);
				await interaction.editReply({
					content: `Giveaway ${giveawayId} has been deleted.`,
					flags: MessageFlags.Ephemeral
				});
			} catch (e) {
				interaction.log(`Failed to delete giveaway: ${e}`);
				await interaction.editReply({
					content: "This giveaway does not exist anymore.",
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			interaction.log(`Giveaway file not found: ${giveawayId}`);
			await interaction.editReply({
				content: "This giveaway does not exist anymore.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
};