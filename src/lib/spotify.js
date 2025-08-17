const request = require("./request.js");

let accessToken = null;

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../types.d.ts").SpotifyConfig} config
 */
const refreshToken = async (logger, config) => {
	const oauth2Response = await request(logger, {
		headers: {
			"authorization": "Basic " + (new Buffer.from(`${config.id}:${config.secret}`).toString("base64")),
			"content-type": "application/x-www-form-urlencoded"
		},
		url: "https://accounts.spotify.com/api/token",
		method: "POST",
		body: "grant_type=client_credentials",
		type: "json"
	});

	accessToken = {
		token: oauth2Response.access_token,
		expiresAt: Date.now() + oauth2Response.expires_in * 1000
	};
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../types.d.ts").SpotifyConfig} config
 * @param {string} query
 */
const search = async (logger, config, query = "artist:Rick Astley track:Never Gonna Give You Up") => {
	if (!accessToken || accessToken.expiresAt - 10 < Date.now()) await refreshToken(logger, config);

	const result = (await request(logger, {
		url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
		method: "GET",
		headers: {
			"Authorization": "Bearer " + accessToken.token
		},
		type: "json"
	}));

	return result?.tracks?.items?.at(0);
};

module.exports = {
	search
};