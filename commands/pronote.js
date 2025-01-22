const { ApplicationCommandType, MessageFlags, SlashCommandBuilder, SlashCommandStringOption } = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "pronote",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("pronote")
		.setDescription("Communication with W.L.M.A. Local Server")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("qr")
				.setDescription("Sets the QR code for Pronote")
				.setRequired(true)
		),
	execute: async (interaction) => {
		const pronoteSettings = settings.guilds[interaction.guildId]?.pronote;

		if (!pronoteSettings?.active) {
			interaction.log("Pronote disabled");
			return await interaction.reply({
				content: "Pronote is currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		const qr = interaction.options.getString("qr");

		if (!fs.existsSync(config.cache.pronote)) fs.mkdirSync(config.cache.pronote, { recursive: true });
		fs.writeFileSync(path.join(config.cache.pronote, "qr.json"), qr, "utf-8");

		await interaction.reply({
			content: `QR code set.`,
			flags: MessageFlags.Ephemeral
		});

		interaction.log("QR code set");
	}
};