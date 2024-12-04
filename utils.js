const sharp = require("sharp");

const settings = require("./settings.js");

const rgbToHex = (r, g, b) => `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;

const getDominantColor = async (buffer) => {
	const data = await sharp(buffer).resize(1, 1).raw().toBuffer();
	const [r, g, b] = data;
	return rgbToHex(r, g, b);
};

const downloadImage = async (url) => {
	const response = await request({
		url,
		method: "GET",
		type: "raw"
	});

	return Buffer.concat(response);
};

module.exports = {
	downloadImage,
	getDominantColor,
	getRoleSettingsForGuild: (guildId, roleId) => {
		const guild = settings.guilds[guildId];
		if (!guild) return null;

		const roleGroups = guild.roles.groups;
		for (const group of roleGroups) {
			if (group.active) {
				for (const role of group.roles) {
					if (role.id === roleId) return role;
				}
			}
		}

		return null;
	},
	rgbToHex
};