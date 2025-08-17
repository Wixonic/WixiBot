let youtubeData = null;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/youtube/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/youtube]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			let body = "";

			req.on("data", (chunk) => body += chunk.toString());

			req.on("end", async () => {
				try {
					const youtubeResponse = JSON.parse(body);
					if (youtubeResponse.name != youtubeData?.name || youtubeResponse.author != youtubeData?.author) {
						youtubeData = youtubeResponse;
						youtubeData.thumbnail = await rpc.getExternalAsset(settings.rpc.discord.application.clients.youtube.id, youtubeData.thumbnail);
						youtubeData.updatedAt = Date.now();
					} else if (youtubeResponse) {
						youtubeData.updatedAt = Date.now();
						youtubeData.timestamps = youtubeResponse.paused ? {} : {
							start: Date.now() - youtubeResponse.time * 1000,
							end: Date.now() + (youtubeResponse.duration - youtubeResponse.time) * 1000
						};
					}

					res.status(204).end();
				} catch (e) {
					youtubeData = null;
					res.status(400).end();
					logger.warn("[rpc/youtube]", e);
				}
			});
		},
		delete: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/youtube]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			youtubeData = null;

			res.status(204).end();
		}
	},
	loop: {
		delay: 1 * 1000,
		process: async (logger, settings, bot, rpc) => {
			if (youtubeData && youtubeData.updatedAt + 30 * 1000 < Date.now()) youtubeData = null;

			if (!youtubeData) {
				rpc.removeActivity("youtube");
				return true;
			} else {
				/**
				 * @type {import("../types.d.ts").Activity}
				*/
				const activity = {
					applicationId: settings.rpc.discord.application.clients.youtube.id,
					assets: {
						small_image: settings.rpc.discord.application.clients.youtube.assets.icon,
						small_text: "YouTube",
						large_image: youtubeData.thumbnail,
						large_text: youtubeData.name
					},
					buttons: [
						"Open video",
						"My channel"
					],
					metadata: {
						button_urls: [
							youtubeData.url,
							"https://go.wixonic.fr/youtube"
						]
					},
					timestamps: youtubeData.timestamps,
					name: youtubeData.name,
					details: youtubeData.name,
					state: `By ${youtubeData.author}`,
					type: "WATCHING"
				};

				const isValidURL = (string) => {
					try {
						const url = new URL(string);
						return url.protocol != "" && url.hostname != "";
					} catch { return false; }
				};

				if (!activity.assets.large_image) {
					if (activity.assets.small_image && isValidURL(activity.assets.small_image)) {
						activity.assets.large_image = activity.assets.small_image;
						delete activity.assets.small_image;
					} else delete activity.assets.large_image;
				}

				rpc.addActivity("youtube", activity);
				return false;
			}
		}
	}
};

module.exports = info;