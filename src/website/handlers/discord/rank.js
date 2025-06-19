const fs = require("fs");
const path = require("path");

const Rank = require("../../../lib/rank.js");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/rank/",
	handlers: {
		get: async (logger, settings, req, res, bot) => {
			const guild = await bot.guilds.fetch(bot.settings.application.guildId);

			try {
				const member = await guild.members.fetch(req.query.id);
				const userRank = Rank.get(logger, bot, req.query.id);

				let file = fs.readFileSync(`${__dirname}/rank.html`, "utf8");
				for (const replacement of [
					["{{ID}}", req.query.id],
					["{{NAME}}", member.displayName]
				]) file = file.replaceAll(replacement[0], replacement[1]);
				res.status(200).send(file);
			} catch (e) {
				logger.warn(`User ${req.query.id} not found:`, e.message ?? e);
				res.status(404).sendFile(path.resolve(`${__dirname}/../../404.html`));
			}
		}
	}
};

module.exports = info;