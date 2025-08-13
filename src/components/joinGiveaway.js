const { ComponentType, MessageFlags, ButtonStyle } = require("discord.js");

const Giveaway = require("../lib/giveaways.js");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Join Giveaway",
	id: "joinGiveaway",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, giveawayId) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveaway = Giveaway.get(logger, bot, giveawayId);

		if (giveaway.status == Giveaway.status.active) {
			const { id } = interaction.user;
			const index = giveaway.participants.indexOf(id);

			if (index != -1) {
				giveaway.participants.splice(index, 1);
				await interaction.followUp("You have successfully left the giveaway.");
			} else {
				giveaway.participants.push(id);
				await interaction.followUp("You have successfully joined the giveaway.");
			}

			if (giveaway.message) {
				try {
					const guild = await bot.guilds.fetch(bot.settings.application.guildId);
					const channel = await guild.channels.fetch(bot.settings.application.commands.giveaways.channel);
					const message = await channel.messages.fetch(giveaway.message);

					const gifts = [];
					for (const gift of giveaway.gifts) gifts.push(gift.name);

					await message.edit({
						allowedMentions: {
							roles: [bot.settings.application.commands.giveaways.role]
						},
						content: `## Giveaway\n\n- Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:f>\n- Entries: **${giveaway.participants.length}**\n### Gifts\n${gifts.length > 0 ? "- " + gifts.join("\n- ") : "_No gift available right now._"}\n\n-# Giveaway #${giveaway.id} - <@&${bot.settings.application.commands.giveaways.role}>`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										custom_id: `joinGiveaway_${giveaway.id}`,
										label: "Join",
										style: ButtonStyle.Primary
									}
								]
							}
						]
					});
				} catch {
					giveaway.message = null;
				}
			}

			await giveaway.save();
		} else interaction.followUp("You can't join this giveaway at the moment. Please try again later.");
	}
};

module.exports = component;