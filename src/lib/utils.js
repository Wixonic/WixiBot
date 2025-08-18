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

/**
 * @param {import("discord.js").Presence | import("discord.js-selfbot-v13").Presence} presence
 * @param {import("discord.js").User | import("discord.js-selfbot-v13").User} user
 * @param {import("../lib/bot.js")?} bot
 */
const displayInlineActivity = async (presence, user, bot) => {
	let text = "";

	text += {
		"online": " \x1b[32m\u25CF\x1b[0m ",
		"idle": " \x1b[33m\u23FE\x1b[0m ",
		"dnd": " \x1b[31m\u2296\x1b[0m ",
		"invisible": " \x1b[90m\u25CC\x1b[0m ",
		"offline": " \x1b[90m\u25CC\x1b[0m "
	}[presence.status];

	text += user.displayName;

	const activities = () => {
		if (presence?.activities.length > 0) {
			const activity = presence.activities.at(0);

			text += {
				"PLAYING": `: \x1b[1mPlaying\x1b[0m ${activity.name}`,
				"STREAMING": `: \x1b[1mStreaming\x1b[0m ${activity.details}`,
				"LISTENING": `: \x1b[1mListening\x1b[0m to ${activity.name}`,
				"WATCHING": `: \x1b[1mWatching\x1b[0m ${activity.details}`,
				"CUSTOM": `: ${activity.emoji ? `${activity.emoji.name} ` : ""}${activity.state ?? ""}`,
				"COMPETING": `: \x1b[1mCompeting\x1b[0m in ${activity.name}`,
				"HANG": `: ${activity.state ?? `${activity.emoji ? `${activity.emoji.name} ` : ""}${activity.state}`}`
			}[activity.type];
		}
	};

	if (bot && user.voice?.channelId) {
		const channel = await bot.channels.fetch(user.voice.channelId);
		if (channel) {
			if (user.voice.streaming) text += `: \x1b[1mStreaming\x1b[0m in `;
			else text += `: \x1b[1mIn\x1b[0m `;
			text += channel.name;
		} else activities();
	} else activities();

	return text;
};

/**
 * @param {number} time 
 * @returns {string}
 */
const displayTime = (time) => {
	const units = [
		{ label: "year", seconds: 365 * 24 * 60 * 60 },
		{ label: "month", seconds: 30 * 24 * 60 * 60 },
		{ label: "day", seconds: 24 * 60 * 60 },
		{ label: "hour", seconds: 60 * 60 },
		{ label: "minute", seconds: 60 },
		{ label: "second", seconds: 1 }
	];

	for (const unit of units) {
		const quotient = Math.floor(time / unit.seconds);
		if (quotient > 0) return `${quotient} ${unit.label}${quotient > 1 ? "s" : ""}`;
	}

	return "0 seconds";
};

/**
 * @param {string} hex
 * @returns {number}
 */
const hexToIntColor = (hex) => {
	try {
		return parseInt(hex.replace("#", "0x"), 16);
	} catch {
		return 0;
	}
};

/**
 * @param {number} max
 * @param {number} min
 */
const randomInt = (max = 2, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * @param {(options: import("discord.js").BaseMessageOptionsWithPoll) => Promise<import("discord.js").Message<boolean>>}
 * @param {import("discord.js").BaseMessageOptionsWithPoll} options
 */
const sendLongMessage = async (handler, options) => {
	const MAX_SIZE = 2000;
	if (!options.content) throw new Error("InvalidOptions: options.content is undefined");

	const parts = [];
	const lines = options.content.split("\n");
	let current = "";

	for (const line of lines) {
		if (current.length + line.length + 1 <= MAX_SIZE) current += (current ? "\n" : "") + line;
		else {
			parts.push(current);
			current = line;
		}
	}

	if (current) parts.push(current);

	for (const part of parts) await handler({
		...options,
		content: part
	});
};

const packageData = require("../package.json");
const userAgent = () => `${packageData.displayName} (v${packageData.version})`;

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
const wait = (milliseconds) => new Promise((resolve) => setTimeout(() => resolve(), milliseconds));

module.exports = {
	clone,
	displayInlineActivity,
	displayTime,
	hexToIntColor,
	randomInt,
	sendLongMessage,
	userAgent,
	wait
};