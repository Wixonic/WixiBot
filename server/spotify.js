const config = require("./config.js");

const request = require("./request.js");

let accessToken = null;

const refreshToken = async () => {
	const oauth2Response = await request({
		headers: {
			"authorization": "Basic " + (new Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString("base64")),
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

const search = async (query = "never gonna give you up") => {
	if (!accessToken || accessToken.expiresAt - 10 < Date.now()) await refreshToken();

	const result = (await request({
		url: `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
		method: "GET",
		headers: {
			"Authorization": "Bearer " + accessToken.token
		},
		type: "json"
	}));

	const track = result?.tracks?.items?.at(0);

	return track;
};

module.exports = {
	search
};