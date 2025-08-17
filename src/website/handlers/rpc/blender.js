let blenderData = null;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/blender/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/blender]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			let body = "";

			req.on("data", (chunk) => {
				body += chunk.toString();
			});

			req.on("end", () => {
				try {
					blenderData = JSON.parse(body);
					blenderData.date = Date.now();
					logger.info("Data updated");

					res.status(200).end();
				} catch (e) {
					blenderData = null;
					res.status(400).end();
				}
			});
		}
	},
	loop: {
		delay: 1 * 1000,
		process: async (logger, settings, bot, rpc) => {
			if (blenderData && blenderData.date + 30 * 1000 < Date.now()) blenderData = null;

			if (!blenderData) rpc.removeActivity("blender");
			else {
				rpc.addActivity("blender", {
					applicationId: settings.rpc.discord.application.clients.blender.id,
					assets: {
						small_image: blenderData.small_image ? settings.rpc.discord.application.clients.blender.assets[blenderData.small_image] : null,
						small_text: blenderData.small_text,
						large_image: blenderData.large_image ? settings.rpc.discord.application.clients.blender.assets[blenderData.large_image] : null,
						large_text: blenderData.large_text
					},
					buttons: [
						"View my renders",
						"My website"
					],
					metadata: {
						button_urls: [
							"https://go.wixonic.fr/youtube",
							"https://wixonic.fr"
						]
					},
					timestamps: {
						start: blenderData.startDate
					},
					name: "Blender",
					details: blenderData.details,
					state: blenderData.state,
					type: "PLAYING"
				});
			}

			return !blenderData;
		}
	}
};

module.exports = info;