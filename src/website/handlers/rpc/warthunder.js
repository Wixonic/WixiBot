let lastWarthunderRefresh = 0;
let inWarthunderGameSince = null;
let warthunderLargeImage = null;
let warthunderData = null;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			try {
				warthunderData = JSON.parse(req.body);
			} catch (e) {
				warthunderData = null;
				res.status(400).end();
				logger.warn("[rpc/warthunder]", e);
			}

			res.status(204).end();
		},
		delete: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			warthunderData = null;

			res.status(204).end();
		}
	},
	loop: {
		delay: 0.5 * 1000,
		process: async (logger, settings, bot, rpc) => {
			const now = Date.now();

			if (warthunderData) {
				if (!inWarthunderGameSince) inWarthunderGameSince = now;

				if (lastWarthunderRefresh + 15 * 1000 < now || !warthunderLargeImage) warthunderLargeImage = await rpc.getExternalAsset(settings.rpc.discord.application.clients.war_thunder.id, new URL(`/rpc/warthunder/map.png?t=${now.toString(16)}`, settings.website.server));

				rpc.addActivity("warthunder", {
					applicationId: settings.rpc.discord.application.clients.war_thunder.id,
					assets: {
						large_image: warthunderLargeImage,
						large_text: warthunderData.unit,
						small_image: settings.rpc.discord.application.clients.war_thunder.assets.icon,
						small_text: "War Thunder"
					},
					buttons: [
						"My profile",
						"My website"
					],
					metadata: {
						button_urls: [
							"https://warthunder.com/community/userinfo/?nick=Wixonic%40psn",
							"https://wixonic.fr"
						]
					},
					timestamps: {
						start: inWarthunderGameSince
					},
					name: "War Thunder",
					details: warthunderData.details,
					type: "PLAYING"
				});

				lastWarthunderRefresh = now;

				return false;
			} else {
				rpc.removeActivity("warthunder");
				inWarthunderGameSince = null;
				lastWarthunderRefresh = now;
				return true;
			}
		}
	}
};

module.exports = info;