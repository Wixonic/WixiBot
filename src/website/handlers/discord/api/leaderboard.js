const Rank = require("../../../../lib/rank.js");

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/api/leaderboard",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const start = req.query.start ?? 0;
			const end = req.query.end;
			const category = req.query.category ?? "all";

			const leaderboard = Rank.getLeaderboard(logger, bot);

			const response = {
				total: {
					month: leaderboard.month.length,
					global: leaderboard.global.length
				},
				updatedAt: leaderboard.updatedAt
			};

			if (["all", "month"].includes(category)) response.month = leaderboard.month.slice(start, end);
			if (["all", "global"].includes(category)) response.global = leaderboard.global.slice(start, end);

			res.status(200).json(response);
		}
	}
};

module.exports = info;