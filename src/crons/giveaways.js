

const { ComponentType, ButtonStyle } = require("discord.js");
const Giveaway = require("../lib/giveaways.js");
const { randomInt } = require("../lib/utils.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Giveaways Update",
	priority: 0,
	condition: (minutes, now) => true, // Every minute
	run: async (logger, bot, minutes, now) => {
		const giveawaysSettings = bot.settings.application.commands.giveaways;
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);

		const channel = await guild.channels.fetch(bot.settings.application.commands.giveaways.channel);

		if (channel && channel.isSendable()) {
			const giveaways = Giveaway.list(logger, bot);

			for (const giveaway of giveaways) {
				if (giveaway.status == Giveaway.status.active && giveaway.previousStatus == Giveaway.status.planned) {
					const gifts = [];
					for (const gift of giveaway.gifts) gifts.push(gift.name);

					const message = await channel.send({
						content: `## Giveaway\n\n- Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:f>\n- Entries: **${giveaway.participants.length}**\n### Gifts\n${gifts.length > 0 ? "- " + gifts.join("\n- ") : "_No gift available right now._"}\n\n-# Giveaway #${giveaway.giveawayId} - <@&${giveawaysSettings.role}>`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										custom_id: `joinGiveawat${giveaway.giveawayId}`,
										label: "Join",
										style: ButtonStyle.Primary
									}
								]
							}
						]
					});

					giveaway.message = message.id;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();
				} else if (giveaway.status == Giveaway.status.done && giveaway.previousStatus == Giveaway.status.active) {
					const winners = {};
					const gifts = [""];

					for (const gift of giveaway.gifts) {
						const potentialWinners = giveaway.participants.filter((participant) => !Object.values(winners).includes(participant));

						if (potentialWinners.length > 0) {
							winners[gift.name] = potentialWinners.at(randomInt(potentialWinners.length) - 1);
							gifts.push(`<@${winners[gift.name]}> won **${gift.name}**`);
							const dmChannel = await bot.users.createDM(winners[gift.name]);
							await dmChannel.send(`## Congrats!\nYou won **${gift.name}** from [this giveaway](<${message.url}>)!\n\nHere is your gift:\n${gift.secret}\n\n-# If you have any problems, feel free to [open a ticket](<https://go.wixonic.fr/help>).\n-# Giveaway #${giveaway.giveawayId}`);
						} else break;
					}

					if (giveaway.message) {
						try {
							const message = await channel.messages.fetch(giveaway.message);
							await message.edit({
								content: `## Giveaway\n- Entries: **${giveaway.participants.length}**\n### Gifts${gifts.join("\n- ")}\n\n-# Giveaway #${giveaway.giveawayId}`,
								components: []
							});
						} catch {
							giveaway.message = null;
						}
					}

					giveaway.winners = winners;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();
				}
			}
		} else logger.error("Invalid channel");
	}
};

module.exports = cron;