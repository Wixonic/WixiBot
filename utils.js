const sharp = require("sharp");

const request = require("./lib/request.js");

const settings = require("./settings.js");


const abort = (time = 0) => new Promise((_, reject) => wait(time).then(() => reject("Aborted")));

const clone = (obj, cloned = new WeakMap()) => {
	if (obj === null || typeof obj !== "object") return obj;
	if (cloned.has(obj)) return cloned.get(obj);

	const clonedObj = Array.isArray(obj) ? [] : {};
	cloned.set(obj, clonedObj);

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) clonedObj[key] = clone(obj[key], cloned);
	}

	return clonedObj;
};

const downloadImage = async (url) => {
	const response = await request({
		url,
		method: "GET",
		type: "raw"
	});

	return Buffer.concat(response);
};

const getDominantColor = async (buffer) => {
	const data = await sharp(buffer).resize(1, 1).raw().toBuffer();
	const [r, g, b] = data;
	return rgbToHex(r, g, b);
};

const getRoleSettingsForGuild = (guildId, roleId) => {
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
};

const hexToIntColor = (hex) => parseInt(hex.replace("#", "0x"), 16);
const titleCase = (str) => str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const rgbToHex = (r, g, b) => `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
const wait = (time = 0) => new Promise((resolve) => setTimeout(() => resolve("Finished waiting"), time * 1000));


module.exports = {
	abort,
	clone,
	downloadImage,
	getDominantColor,
	getRoleSettingsForGuild,
	titleCase,
	rgbToHex,
	hexToIntColor,
	wait
};