/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/obs/widgets/time/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const now = new Date();
			res.status(200).send(`${now.getHours().toString().padStart(2, "0")}<span style="color: #888">:</span>${now.getMinutes().toString().padStart(2, "0")}`);
		}
	}
};

module.exports = info;;