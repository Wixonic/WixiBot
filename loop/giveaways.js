const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { Giveaway } = require("../lib/giveaways.js");

const { getGuild, client } = require("../clients.js");
const { randomInt } = require("../utils.js");

const settings = require("../settings.js");

/**
 * @param {import("../loop.js")} loop 
 */
module.exports = async (loop) => {
	for (const guildId in settings.guilds) {
		const guildSettings = settings.guilds[guildId];
		const giveawaysSettings = guildSettings?.giveaways;

		const guild = await getGuild(guildId);

		if (guild && giveawaysSettings?.active) {
			if (!giveawaysSettings?.channel) throw "Giveaway channel not set";

			const channel = await guild.channels.fetch(giveawaysSettings?.channel);

			if (!channel) throw `Giveaway channel "${giveawaysSettings?.channel}" not found`;
			if (!channel.isTextBased()) throw `Giveaway channel "${channel.name}" (${channel.id}) is not text-based`;

			const giveaways = Giveaway.list(guildId);

			for (const giveaway of giveaways) {
				if (giveaway.status == Giveaway.status.active && giveaway.previousStatus == Giveaway.status.planned) {
					const gifts = [];
					for (const gift of giveaway.gifts) gifts.push(gift.name);

					const message = await channel.send({
						content: `## Giveaway\n\n- Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:f>\n- Entries: **${giveaway.participants.length}**\n### Gifts\n${gifts.length > 0 ? "- " + gifts.join("\n- ") : "_No gift available right now._"}\n\n-# Giveaway ${giveaway.giveawayId}`,
						components: [
							new ActionRowBuilder()
								.addComponents(
									new ButtonBuilder()
										.setCustomId(`giveawayJoin_${giveaway.giveawayId}`)
										.setLabel("Join")
										.setStyle(ButtonStyle.Primary)
								)
						]
					});

					giveaway.message = message.id;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();
				} else if (giveaway.status == Giveaway.status.done && giveaway.previousStatus == Giveaway.status.active) {
					const message = await channel.messages.fetch(giveaway.message);

					const winners = {};
					const gifts = [""];

					for (const gift of giveaway.gifts) {
						const potentialWinners = giveaway.participants.filter((participant) => !Object.values(winners).includes(participant));
						if (potentialWinners.length > 0) {
							winners[gift.name] = potentialWinners.at(randomInt(potentialWinners.length) - 1);
							gifts.push(`<@${winners[gift.name]}> won **${gift.name}**`);
							const dmChannel = await client.users.createDM(winners[gift.name]);
							await dmChannel.send(`## Congrats!\nYou won **${gift.name}** from [this giveaway](<${message.url}>)!\n\nHere is your gift:\n${gift.secret}\n\n-# If you have any problems, feel free to [open a ticket](<https://go.wixonic.fr/help>).\n-# Giveaway ${giveaway.giveawayId}`);
						} else break;
					}

					if (message) {
						await message.edit({
							content: `## Giveaway\n- Entries: **${giveaway.participants.length}**\n### Gifts${gifts.join("\n- ")}\n\n-# Giveaway ${giveaway.giveawayId}`,
							components: []
						});
					}

					giveaway.winners = winners;
					giveaway.previousStatus = giveaway.status;
					await giveaway.save();
				}
			}
		}
	}
};