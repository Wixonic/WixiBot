const { ComponentType, MessageFlags } = require("discord.js");

const Giveaway = require("../lib/giveaways.js");

/**
 * @type {import("../types").ComponentInfo}
 */
const component = {
	name: "Cancel Giveaway",
	id: "cancelGiveaway",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, giveawayId) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveaway = Giveaway.get(logger, bot, giveawayId);

		if (giveaway.message) {
			try {
				const guild = await bot.guilds.fetch(bot.settings.application.guildId);
				const channel = await guild.channels.fetch(bot.settings.application.commands.giveaways.channel);
				const message = await channel.messages.fetch(giveaway.message);

				const gifts = [];
				for (const gift of giveaway.gifts) gifts.push(gift.name);

				await message.edit({
					content: `## Giveaway (cancelled)\n- Entries: **${giveaway.participants.length}**\n### Gifts${gifts.join("\n- ")}\n\n-# Giveaway #${giveaway.id}`,
					components: []
				});
			} catch {
				giveaway.message = null;
			}
		}

		giveaway.cancelled = true;
		await giveaway.save();

		await interaction.followUp(`The giveaway #${giveaway.id} has been cancelled.`);
	}
};

module.exports = component;