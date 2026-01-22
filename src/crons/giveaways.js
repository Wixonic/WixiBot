const { ButtonStyle, ComponentType } = require("discord.js");

const Giveaway = require("../lib/giveaways.js");
const { randomInt } = require("../lib/utils.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Giveaways Update",
	priority: 0,
	condition: (minutes, now) => minutes % 30 === 0, // Every 30 minutes
	run: async (logger, bot, minutes, now) => {
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);

		const channel = await guild.channels.fetch(bot.settings.application.commands.giveaways.channel);

		if (channel && channel.isSendable()) {
			const giveaways = Giveaway.list(logger, bot);

			for (const giveaway of giveaways) {
				if (giveaway.status === Giveaway.status.active && giveaway.previousStatus === Giveaway.status.planned) {
					const gifts = [];
					const notes = [];
					for (const gift of giveaway.gifts) {
						gifts.push(gift.name);
						if (gift.note) notes.push(`**${gift.name}**: ${gift.note}`);
					}

					const message = await channel.send({
						allowedMentions: {
							roles: [bot.settings.application.commands.giveaways.role]
						},
						content: `## Giveaway\n\n- Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:f>\n- Entries: **${giveaway.participants.length}**\n### Gifts\n${gifts.length > 0 ? "- " + gifts.join("\n- ") : "_No gift available right now._"}\n\n-# ${notes.join("\n-# ")}\n-# Giveaway #${giveaway.id} - <@&${bot.settings.application.commands.giveaways.role}>`,
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
						],
						flags: process.env.silent === "true" ? MessageFlags.SuppressNotifications : null
					});

					giveaway.message = message.id;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();
				} else if (giveaway.status === Giveaway.status.done && giveaway.previousStatus === Giveaway.status.active) {
					const winners = {};
					const gifts = [""];

					let message = null;

					try {
						message = await channel.messages.fetch(giveaway.message);
					} catch {
						giveaway.message = null;
					}

					for (const gift of giveaway.gifts) {
						const potentialWinners = giveaway.participants.filter((participant) => !Object.values(winners).includes(participant));

						if (potentialWinners.length > 0) {
							winners[gift.name] = potentialWinners.at(randomInt(potentialWinners.length, 1) - 1);
							gifts.push(`<@${winners[gift.name]}> won **${gift.name}**`);
							const dmChannel = await bot.users.createDM(winners[gift.name]);
							await dmChannel.send(`## Congrats!\nYou won **${gift.name}** from [this giveaway](<${message ? message.url : "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}>)!\n\nHere is your gift:\n${gift.secret + (gift.note ? `\n-# ${gift.note}` : "")}\n\n-# If you have any questions, contact our support team by opening a ticket [here](<https://go.wixonic.fr/help>).\n-# Giveaway #${giveaway.id}`);
						} else break;
					}

					giveaway.winners = winners;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();

					if (message) {
						await message.edit({
							content: `## Giveaway\n- Entries: **${giveaway.participants.length}**\n### Gifts${gifts.join("\n- ")}\n\n-# Giveaway #${giveaway.id}`,
							components: []
						});
					}
				}
			}
		} else logger.error("Invalid channel");
	}
};

module.exports = cron;