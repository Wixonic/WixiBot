let githubData = null;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/github/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/github]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			try {
				const githubResponse = JSON.parse(req.body);

				let conditions = githubResponse.type != githubData?.type;
				switch (githubResponse.type) {
					case "repository":
						conditions ||= githubResponse.repository != githubData?.repository || githubResponse.owner != githubData?.owner;
						break;

					case "profile":
						conditions ||= githubResponse.profile != githubData?.profile;
						break;
				};

				if (conditions) {
					githubData = githubResponse;
					githubData.startedAt = Date.now();
					githubData.updatedAt = Date.now();

					switch (githubResponse.type) {
						case "repository":
							githubData.large_image = await rpc.getExternalAsset(settings.rpc.discord.application.clients.github.id, `https://github.com/${githubData.owner}.png`);
							break;

						case "profile":
							githubData.large_image = await rpc.getExternalAsset(settings.rpc.discord.application.clients.github.id, `https://github.com/${githubData.profile}.png`);
							break;
					}

					logger.info("[rpc/github]", "Data updated");
				} else {
					if (githubData) githubData.updatedAt = Date.now();
					logger.debug("[rpc/github]", "Timings updated");
				}

				res.status(200).end();
			} catch (e) {
				githubData = null;
				res.status(400).end();
			}
		},
		delete: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/github]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			githubData = null;

			res.status(204).end();
		}
	},
	loop: {
		delay: 1 * 1000,
		process: async (logger, settings, bot, rpc) => {
			if (githubData && githubData.updatedAt + 30 * 1000 < Date.now()) githubData = null;

			if (!githubData) {
				rpc.removeActivity("github");
				return true;
			} else {
				/**
				 * @type {import("../types.d.ts").Activity}
				 */
				let data = null;
				const type = githubData.type;

				switch (type) {
					case "repository":
						const owner = githubData.owner ?? "owner";
						const repo = githubData.repository ?? "repository";

						data = {
							applicationId: settings.rpc.discord.application.clients.github.id,
							assets: {
								small_image: settings.rpc.discord.application.clients.github.assets.icon,
								small_text: "GitHub",
								large_image: githubData.large_image,
								large_text: owner
							},
							buttons: [
								"Open repo on GitHub",
								"My profile"
							],
							metadata: {
								button_urls: [
									`https://github.com/${owner}/${repo}`,
									"https://go.wixonic.fr/github"
								]
							},
							name: `${owner}/${repo}`,
							details: `Watching ${githubData.details ?? "the repository"}`,
							state: "On GitHub",
							type: "WATCHING"
						};
						break;

					case "profile":
						const profile = githubData.profile ?? "someone";

						data = {
							applicationId: settings.rpc.discord.application.clients.github.id,
							assets: {
								small_image: settings.rpc.discord.application.clients.github.assets.icon,
								small_text: "GitHub",
								large_image: githubData.large_image,
								large_text: profile
							},
							buttons: [
								"Open profile on GitHub",
								"My profile"
							],
							metadata: {
								button_urls: [
									`https://github.com/${profile}`,
									"https://go.wixonic.fr/github"
								]
							},
							name: `${profile}'${profile.endsWith("s") ? "" : "s"} profile`,
							details: `Watching ${githubData.details ?? "the profile"}`,
							state: "On GitHub",
							type: "WATCHING"
						};
						break;
				};

				if (data) {
					rpc.addActivity("github", data);
					return false;
				} else {
					rpc.removeActivity("github");
					return true;
				}
			}
		}
	}
};

module.exports = info;