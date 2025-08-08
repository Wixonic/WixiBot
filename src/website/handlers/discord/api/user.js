const Rank = require("../../../../lib/rank.js");

/**
 * @type {import("../../../../types").HandlerInfo}
 */
const info = {
	path: "/discord/api/user",
	handlers: {
		get: async (logger, settings, req, res, bot) => {
			const id = req.query.id;
			if (!id) return res.status(400).json({
				code: "missing_parameter",
				error: "No user ID provided"
			});

			const user = await bot.users.fetch(id);

			if (!user) return res.status(404).json({
				code: "not_found",
				error: `User with ID ${id} not found`
			});

			if (user.bot) return res.status(403).json({
				code: "bot",
				error: `User with ID ${id} is a bot`
			});

			res.status(200).json({
				id: req.query.id,
				avatar: user.avatarURL({ size: 256 }),
				decoration: user.avatarDecorationURL({ size: 256 }),
				username: user.discriminator != "0" ? `${user.username}#${user.discriminator}` : user.username,
				displayName: user.globalName
			});
		}
	}
};

module.exports = info;;;