import {
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder
} from "discord.js";

import { client } from "../lib/client.ts";
import { getSettings } from "../lib/settings.ts";

export const getFundingMessage = async (guildId?: string) => {
	const settings = getSettings();
	const fundingSku = settings.discord.sku.funding;

	if (fundingSku) {
		const guild = guildId ? await client.getGuild(guildId) : null;
		return [
			new ContainerBuilder()
				.addTextDisplayComponents((component) => component
					.setContent(`# Support my work!
Money doesn’t grow on trees, and neither does quality content!
If you want to support my projects, make a donation!
There's multiple ways to do so, and **two of them are available in Discord**!`)
				)
				.addTextDisplayComponents((component) => component
					.setContent(`## But what do I get in return?
Learn more about the perks of supporting me by clicking the button below!`)
				)
				.addActionRowComponents((component) => component
					.addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Learn more!")
							.setURL("https://wixonic.fr/funding")
					)
				)
				.addTextDisplayComponents((component) => component
					.setContent(`### On Discord
You can either subscribe and get the <@&${settings.discord.roles.supporter}> role or boost ${guildId ? "this" : "my"} server and get the ${guild && guild.settings.roles?.server_booster !== undefined ? `<@&${guild.settings.roles.server_booster}>` : "booster"} role!`)
				)
				.addActionRowComponents((component) => component
					.addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Premium)
							.setSKUId(fundingSku),
						guildId ?
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setLabel("Boost this server!")
								.setURL(`https://discord.com/channels/${guildId}/boosts`) :
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setLabel("Join and boost my server!")
								.setURL(settings.links?.funding ?? settings.discord.invite ?? "https://go.wixonic.fr/discord")
					)
				)
				.addTextDisplayComponents((component) => component
					.setContent(`### More ways
If you don't want to support me on Discord, check this link below!`)
				)
				.addActionRowComponents((component) => component
					.addComponents(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel("Find more ways!")
							.setURL("https://wixonic.fr/funding")
					)
				)
		];
	} else throw new Error("Funding SKU is not defined in the settings.");
};