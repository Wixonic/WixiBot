const Rank = require("../../../../../lib/rank.js");

/**
 * @type {import("../../../../types").HandlerInfo}
 */
const info = {
	path: "/discord/api/user/rank",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const id = req.query.id;
			if (!id) return res.status(400).json({
				code: "missing_parameter",
				error: "No user ID provided"
			});

			const rank = Rank.get(logger, bot, id, true);

			if (!rank) return res.status(404).json({
				code: "not_found",
				error: `User with ID ${id} not found`
			});

			res.status(200).json({
				id: rank.memberId,
				eliteOfTheMonth: rank.eliteOfTheMonth,
				penalty: rank.penalty,
				points: rank.points,
				rank: rank.rank
			});
		}
	}
};

module.exports = info;