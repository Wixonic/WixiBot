const { Ollama } = require("ollama");
const sharp = require("sharp");
const request = require("./request.js");

const ollama = new Ollama();

/**
 * @typedef {object} Result
 * @property {boolean} safe
 * @property {number} confidence
 * @property {string} flag
 */

/**
 * @typedef {object} MessageResult
 * @property {Record<string, Result>} attachments
 * @property {Result?} content
 * @property {{safe: boolean, confidence: number, flags: string[]}} final
 */

const moderation = {
	format: {
		type: "object",
		properties: {
			valid: {
				type: "boolean"
			},
			confidence: {
				type: "number"
			},
			flag: {
				type: "string"
			}
		},
		required: [
			"valid",
			"confidence"
		]
	},
	rules: "Carefully analyze the provided content to determine if it is safe for work. Consider language, imagery, and context to assess appropriateness for a public Discord chat. Emojis in the format <:name:id>, and URLs are allowed.\n\n- valid: boolean indicating if the content is safe for work.\n- confidence: score between 0 and 1 representing the assistant's certainty.\n- flag: single applicable flag describing content issue if not valid.",

	/**
	 * @param {import("@wixonic/logger").Logger} logger 
	 * @param {import("./bot.js")} bot 
	 * @param {import("discord.js").Message} message
	 * @returns {Promise<MessageResult>}
	 */
	analyseMessage: async (logger, bot, message) => {
		const attachments = message.attachments.values();

		/**
		 * @type {MessageResult}
		 */
		const results = {
			attachments: {},
			content: message.cleanContent.trim().length > 0 ? await moderation.analyseText(logger, bot.settings.secrets.moderation.llm, message.cleanContent) : null
		};

		for (const attachment of attachments) {
			if (/^image\/(png|jpeg|jpg|gif|webp|apng)$/i.test(attachment.contentType)) {
				try {
					const response = await request(logger, {
						method: "GET",
						type: "raw",
						url: attachment.url
					});

					const image = sharp(Buffer.concat(response), { pages: 1 })
						.resize({ width: 512, height: 512, fit: "inside" })
						.jpeg({ quality: 85 });

					results.attachments[attachment.id] = await moderation.analyseImage(logger, bot.settings.secrets.moderation.llm, await image.toBuffer());
				} catch (e) {
					logger.warn("Failed to download attachment:", e);
				}
			}
		}

		let valid = true;
		const flags = [];
		const confidenceLevels = [];

		if (results.content) {
			valid &&= results.content.valid;
			if (results.content.flag && results.content.flag != "none") flags.push(results.content.flag);
			confidenceLevels.push(results.content.confidence);
		}

		for (const id in results.attachments) {
			const attachment = results.attachments[id];
			if (attachment) {
				valid &&= attachment.valid;
				if (attachment.flag && attachment.flag != "none") flags.push(attachment.flag);
				confidenceLevels.push(attachment.confidence);
			}
		}

		results.final = {
			valid,
			confidence: Math.min(...confidenceLevels),
			flags
		};

		logger.debug(JSON.stringify(results.final));

		return results;
	},

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {string} model
	 * @param {string} text
	 * @returns {Promise<Result>}
	 */
	analyseText: async (logger, model, text) => {
		const response = await ollama.chat({
			model,
			messages: [
				{
					role: "system",
					content: moderation.rules
				}, {
					role: "user",
					content: "Analyze the provided text for safety and policy violations."
				}, {
					role: "user",
					content: text
				}
			],
			format: moderation.format,
			keep_alive: 15,
			stream: false,
			options: {
				num_predict: 100
			}
		});

		return JSON.parse(response.message.content);
	},

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {string} model
	 * @param {Buffer} image
	 * @returns {Promise<Result>}
	 */
	analyseImage: async (logger, model, image) => {
		const response = await ollama.chat({
			model,
			messages: [
				{
					role: "system",
					content: moderation.rules
				}, {
					role: "user",
					content: "Analyze the attached image for safety and policy violations.",
					images: [Uint8Array.from(image)]
				}
			],
			format: moderation.format,
			keep_alive: 15,
			stream: false,
			options: {
				num_predict: 100
			}
		});

		return JSON.parse(response.message.content);
	}
};

module.exports = moderation;