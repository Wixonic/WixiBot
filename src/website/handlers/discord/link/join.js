const Rank = require("../../../../lib/rank.js");
const request = require("../../../../lib/request.js");
const { userAgent } = require("../../../../lib/utils.js");

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/discord/link/join/",
	handlers: {
		get: async (logger, settings, req, res, bot) => {
			let redirect = req.query.redirect;

			if (req.query.state) {
				const state = JSON.parse(decodeURIComponent(req.query.state));
				redirect = state.redirect;
			}

			if (!redirect) return res.status(400).send("Missing redirect URL");

			if (req.query.code) {
				try {
					const params = new URLSearchParams();
					params.append("grant_type", "authorization_code");
					params.append("code", req.query.code);
					params.append("redirect_uri", new URL("/discord/link/join/", settings.website.server).toString());

					const token = await request(logger, {
						auth: `${settings.application.clientId}:${settings.application.clientSecret}`,
						headers: {
							"Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent()
						},
						type: "json",
						method: "POST",
						url: new URL("/api/v10/oauth2/token", "https://discord.com"),
						body: params.toString()
					});
					if (token.error) throw token.error ?? "Failed to get token from Discord";

					const me = await request(logger, {
						headers: {
							"Authorization": `${token.token_type} ${token.access_token}`,
							"User-Agent": userAgent()
						},
						type: "json",
						method: "GET",
						url: new URL("/api/v10/users/@me", "https://discord.com")
					});
					if (me.error) throw me.error ?? "Failed to get user profile from Discord";

					const functionsResponse = await request(logger, {
						headers: {
							"Content-Type": "application/json"
						},
						type: "json",
						method: "POST",
						secure: process.env.dev != "true",
						url: new URL((process.env.dev == "true" ? "/wixonic-website-2/europe-west1/httpServer" : "") + "/auth/discord/", settings.website.functions),
						body: JSON.stringify({
							discord: {
								id: me.id,
								displayName: me.global_name,
								username: me.username
							},
							wixkey: settings.secrets.wixkey
						})
					});

					if (functionsResponse.error || !functionsResponse.customToken) throw functionsResponse.error || "Firebase function failed to process authentication.";

					const rank = Rank.get(logger, bot, me.id);
					rank.linked = true;
					await rank.save();

					const callbackUrl = new URL("/verify/", settings.website.accounts);
					callbackUrl.searchParams.set("mode", "finalizeDiscord");
					callbackUrl.searchParams.set("token", functionsResponse.customToken);
					callbackUrl.searchParams.set("redirect", redirect);

					return res.redirect(callbackUrl.toString());
				} catch (error) {
					logger.warn("Discord join process failed:", error);
					return res.redirect(redirect);
				}
			} else return res.redirect(new URL(`/oauth2/authorize?client_id=${settings.application.clientId}&response_type=code&redirect_uri=${encodeURIComponent(new URL("/discord/link/join/", settings.website.server).toString())}&scope=identify&prompt=none&state=${encodeURIComponent(JSON.stringify({
				redirect
			}))}`, "https://discord.com"));
		}
	}
};

module.exports = info;