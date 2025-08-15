const Rank = require("../../../../lib/rank.js");

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/link/delete/",
	handlers: {
		post: async (logger, settings, req, res, bot) => {
			const authHeader = req.headers.authorization;
			if (!authHeader || authHeader !== `Basic ${btoa(settings.secrets.wixkey)}`) return res.status(401).send("Unauthorized: Invalid API key");

			const id = req.body;
			if (!id) return res.status(400).send("Missing ID");

			const rank = Rank.get(logger, bot, id);
			rank.linked = false;
			await rank.save();

			return res.status(204).end();
		}
	}
};

module.exports = info;