const { google } = require("googleapis");

const config = require("./config.js");

const search = (query = "never gonna give you up") => new Promise((resolve, reject) => {
	google.youtube("v3").search.list({
		key: config.youtube.key,
		maxResults: 1,
		part: "snippet",
		q: query,
		safeSearch: "none",
		type: "video",
		videoCategoryId: 10,
		videoDimension: "2d"
	}, (e, response) => {
		if (e) reject(e);
		else resolve(response?.data?.items?.at(0)?.id?.videoId);
	});
});

module.exports = {
	search
};