const request = require("../../../lib/request.js");
const { userAgent } = require("../../../lib/utils.js");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/link/",
	handlers: {
		get: async (logger, settings, req, res) => {
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
				params.append("redirect_uri", new URL("/discord/link/", settings.secrets.server.url).toString());
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

				logger.info("Token:", JSON.stringify(token));

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

					logger.info("Me:", JSON.stringify(me));

					if (!me.error) {
						// Save data

						return res.redirect(new URL(`/discord/link/save/?id=${me.user.id}&username=${me.user.username}&uid=${uid}&redirect=${encodeURIComponent(redirect)}`, settings.secrets.server.url));
					}
				}
			} else return res.redirect(new URL(`/oauth2/authorize?client_id=${settings.application.clientId}&response_type=code&redirect_uri=${encodeURIComponent(new URL("/discord/link/", settings.secrets.server.url).toString())}&scope=identify&consent=none&state=${encodeURIComponent(JSON.stringify({
				redirect,
				uid
			}))}`, "https://discord.com"));

			res.redirect(new URL("/discord/", settings.secrets.server.url));
		}
	}
};

module.exports = info;