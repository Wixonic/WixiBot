const request = require("../../../lib/request.js");
const { userAgent } = require("../../../lib/utils.js");

const Rank = require("../../../lib/rank.js");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/link/",
	handlers: {
		get: async (logger, settings, req, res, bot) => {
			let redirect = req.query.redirect;
			let uid = req.query.uid;
			if (req.query.state) {
				const state = JSON.parse(decodeURIComponent(req.query.state));
				redirect = state.redirect;
				uid = state.uid;
			}

			if (!redirect) return res.status(400).send("Missing redirect URL");
			if (!uid) return res.status(400).send("Missing UID");

			if (req.query.code) {
				const params = new URLSearchParams();
				params.append("grant_type", "authorization_code");
				params.append("code", req.query.code);
				params.append("redirect_uri", new URL("/discord/link/", settings.website.server).toString());
				const token = await request(logger, {
					auth: `${settings.application.clientId}:${settings.application.clientSecret}`,
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"User-Agent": userAgent()
					},
					type: "json",
					method: "POST",
					url: new URL("/api/v10/oauth2/token", "https://discord.com"),
					body: params.toString()
				});

				if (!token.error) {
					const me = await request(logger, {
						headers: {
							"Authorization": `${token.token_type} ${token.access_token}`,
							"User-Agent": userAgent()
						},
						type: "json",
						method: "GET",
						url: new URL("/api/v10/oauth2/@me", "https://discord.com")
					});

					if (!me.error) {
						const rank = Rank.get(logger, bot, me.user.id);
						rank.linked = true;
						await rank.save();

						const link = await request(logger, {
							headers: {
								"Content-Type": "application/json"
							},
							type: "json",
							method: "POST",
							body: JSON.stringify({
								id: me.user.id,
								username: me.user.username,
								uid,
								wixkey: settings.secrets.wixkey
							}),
							url: new URL((process.env.dev == "true" ? "/wixonic-website-2/europe-west1/httpServer" : "") + "/auth/link/discord/", settings.website.functions),
						});

						if (!link.error) return res.redirect(redirect);
					}
				}
			} else return res.redirect(new URL(`/oauth2/authorize?client_id=${settings.application.clientId}&response_type=code&redirect_uri=${encodeURIComponent(new URL("/discord/link/", settings.website.server).toString())}&scope=identify&prompt=none&state=${encodeURIComponent(JSON.stringify({
				redirect,
				uid
			}))}`, "https://discord.com"));

			res.redirect(new URL("/discord/", settings.website.server));
		}
	}
};

module.exports = info;