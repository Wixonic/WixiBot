const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { Giveaway } = require("../lib/giveaways.js");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "giveawayJoin",
	args: 1,
	execute: async (interaction, args) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const guildSettings = settings.guilds[interaction.guildId];
		const giveawaysSettings = guildSettings?.giveaways;

		const giveawayId = args[0];
		const giveawayPath = path.join(config.cache.giveaways, interaction.guildId, giveawayId + ".json");

		if (fs.existsSync(giveawayPath)) {
			try {
				const giveaway = Giveaway.get(interaction.guildId, giveawayId);

				if (giveaway.participants.includes(interaction.user.id)) {
					giveaway.participants.splice(giveaway.participants.indexOf(interaction.user.id), 1);
					await interaction.editReply({
						content: "Giveaway successfully left.",
						flags: MessageFlags.Ephemeral
					});
				} else {
					giveaway.participants.push(interaction.user.id);
					await interaction.editReply({
						content: "Giveaway successfully joined.",
						flags: MessageFlags.Ephemeral
					});
				}

				await giveaway.save();

				const gifts = [];
				for (const gift of giveaway.gifts) gifts.push(gift.name);

				const channel = await interaction.guild.channels.fetch(giveawaysSettings?.channel);
				if (channel) {
					const message = await channel.messages.fetch(giveaway.message);
					if (message) {
						await message.edit({
							content: `## Giveaway\n\n- Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:f>\n- Entries: **${giveaway.participants.length}**\n### Gifts\n${gifts.length > 0 ? "- " + gifts.join("\n- ") : "_No gift available right now._"}\n\n-# Giveaway ${giveaway.giveawayId}`
						});
					} else interaction.error("Failed to fetch giveaway message");
				} else interaction.error("Failed to fetch giveaway channel");
			} catch (e) {
				interaction.log(`Failed to join giveaway: ${e}`);
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