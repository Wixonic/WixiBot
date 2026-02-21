const { ComponentType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { getStorage } = require("../lib/storage.js");
const fs = require("fs");
const path = require("path");

/**
 * @type {import("../types").ComponentInfo}
 */
const component = {
	name: "Delete Storage",
	id: "deleteStorage",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, id) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const api = getStorage(bot.settings);
		const db = api.read();

		if (!db[id]) return await interaction.followUp(`This file doesn't exist. If this is an issue, contact the staff via the <#${bot.settings.application.ticketChannel}> channel.`);

		const isAuthor = db[id].author === interaction.user.id;
		const isMod = interaction.member.roles.cache.has(bot.settings.application.ticketChannel) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

		if (!isAuthor && !isMod) return await interaction.followUp(`You do not have permission to delete this file. If this is an issue, contact the staff via the <#${bot.settings.application.ticketChannel}> channel.`);

		if (db[id].filename) {
			const filePath = path.join(api.storagePath, id);
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		}

		delete db[id];
		api.write(db);

		try {
			await interaction.message.edit({
				components: []
			});
		} catch (e) {
			logger.warn(`Failed to remove button from original storage message ${interaction.message?.id || "unknown"}`, e);
		}

		await interaction.followUp(`File \`${id}\` has been deleted.`);
	}
};

module.exports = component;