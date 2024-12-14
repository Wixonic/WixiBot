const { google } = require("googleapis");

const config = require("../config.js");

const search = (query = "Rick Astley - Never Gonna Give You Up") => new Promise((resolve, reject) => {
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
		else resolve(response?.data?.items?.at(0) ?? null);
	});
});

const get = (videoId = "dQw4w9WgXcQ") => new Promise((resolve, reject) => {
	google.youtube("v3").videos.list({
		key: config.youtube.key,
		maxResults: 1,
		part: "snippet",
		id: videoId
	}, (e, response) => {
		if (e) reject(e);
		else resolve(response?.data?.items?.at(0) ?? null);
	});
});

module.exports = {
	get,
	search
};