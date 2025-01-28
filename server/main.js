const { RichPresence } = require("discord.js-selfbot-v13");

const log = require("../log.js");

const request = require("../lib/request.js");
const spotify = require("../lib/spotify.js");

const blender = require("./blender.js");
const discord = require("./client.js");
const { getCurrentTrackInfo } = require("./music.js");
const pronote = require("./pronote.js");
const wt = require("./warthunder.js");

const config = require("../config.js");

blender.launch();

let lastBlenderUpdate = 0;
const processBlender = async () => {
	const blenderData = blender.get();

	if (!blenderData || blenderData.date + 30 * 1000 < Date.now()) {
		blender.reset();
		discord.removeActivity("blender");
	} else if (lastBlenderUpdate + 20 * 1000 < Date.now()) {
		discord.addActivity("blender", {
			level: 2,
			applicationId: config.discord.application.clientId,
			assets: {
				small_image: blenderData.small_image ? `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets[blenderData.small_image]}.png` : null,
				small_text: blenderData.small_text,
				large_image: blenderData.large_image ? `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets[blenderData.large_image]}.png` : null,
				large_text: blenderData.large_text
			},
			timestamps: {
				start: blenderData.startDate
			},
			name: "Blender",
			details: blenderData.details,
			state: blenderData.state,
			type: 0 // PLAYING
		});

		lastBlenderUpdate = Date.now();
	}
};


let lastPronoteUpdate = 0;

const processPronote = async () => {
	if (lastPronoteUpdate + 5 * 60 * 1000 < Date.now()) {
		const currentClass = await pronote.requestClassAt(new Date());

		if (!currentClass) discord.removeActivity("pronote");
		else {
			discord.addActivity("pronote", {
				level: 1,
				applicationId: config.discord.application.clientId,
				assets: {
					large_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.clock}.png`,
					large_text: `Ends at ${String(currentClass.endDate.getHours()).padStart(2, "0")}:${String(currentClass.endDate.getMinutes()).padStart(2, "0")} UTC+${-currentClass.endDate.getTimezoneOffset() / 60}`
				},
				name: currentClass.subject,
				details: currentClass.subject,
				state: `Started at ${String(currentClass.startDate.getHours()).padStart(2, "0")}:${String(currentClass.startDate.getMinutes()).padStart(2, "0")} UTC+${-currentClass.startDate.getTimezoneOffset() / 60}`,
				type: 5 // COMPETING
			});
		}

		lastPronoteUpdate = Math.floor(Date.now() / 5 * 60 * 1000) * 5 * 60 * 1000;
	}
};


let lastMapRefresh = 0;
let inWarThunderGameSince = null;

const processWarThunder = async () => {
	const data = await wt();

	if (data.valid) {
		if (!inWarThunderGameSince) inWarThunderGameSince = Date.now();
		if (lastMapRefresh + 30 * 1000 < Date.now()) {
			const getImage = async () => {
				await request({
					url: new URL("/warthunder/warthundermap.png", config.server.url),
					method: "POST",
					headers: {
						authorization: `WixKey ${config.wixkey}`,
						"content-type": "image/png"
					},
					secure: false,
					type: "raw",
					body: data.map.toString("base64url")
				});

				return await RichPresence.getExternal(discord.client, config.discord.application.clientId, new URL(`/warthunder/warthundermap.png?t=${Date.now()}`, config.server.url));
			};

			const mapImage = await getImage();

			discord.addActivity("wt", {
				level: 2,
				applicationId: config.discord.application.clientId,
				assets: {
					large_image: mapImage[0].external_asset_path,
					large_text: data.vehicle,
					small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.war_thunder}.png`,
					small_text: "War Thunder"
				},
				timestamps: {
					start: inWarThunderGameSince
				},
				name: "War Thunder",
				details: data.vehicle,
				type: 0 // PLAYING
			});

			lastMapRefresh = Date.now();
		}
	} else {
		discord.removeActivity("wt");
		inWarThunderGameSince = null;
	}
};

/**
 * @type {import("../types.js").Song?}
 */
let currentSong = null;

/**
 * @param {import("../types.js").Song?} song 
 */
const processTrack = async (song) => {
	const update = async () => {
		if (discord.activities.length > 0) discord.removeActivity("music");

		if (song == null) {
			currentSong = null;
			discord.removeActivity("music");

			log("Music stopped.");
		} else if ((currentSong?.state != "PAUSED" && song.state == "PAUSED") || song.state != "PAUSED") {
			if (song.state == "PAUSED" && currentSong) {
				song = currentSong;
				currentSong.state = "PAUSED";
			}

			const spotifySong = (await spotify.search(`artist:${song.artist} track:${song.track}`)) ?? null;
			song.spotifyId = spotifySong?.id ?? null;
			const spotifyArtworkUrl = spotifySong?.album?.images?.at(0)?.url;
			song.spotifyArtwork = spotifyArtworkUrl?.slice((spotifyArtworkUrl?.lastIndexOf("/") ?? -1) + 1) ?? null;

			if (song.state == "PLAYING") {
				discord.addActivity("music", {
					level: 0,
					assets: {
						large_image: `spotify:${song.spotifyArtwork}`,
						large_text: song.album,
						small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.apple_music}.png`,
						small_text: "Apple Music"
					},
					timestamps: {
						start: song.startedAt,
						end: song.startedAt + song.duration
					},
					name: song.track,
					details: song.track,
					state: song.artist,
					type: 2 // LISTENING
				});
			} else discord.removeActivity("music");

			currentSong = song;
			log(`Music set to ${currentSong.track} by ${currentSong.artist} (${currentSong.state}).`);
		}
	};

	if (song == null) {
		if (currentSong != null) await update();
	} else {
		if (currentSong == null || (currentSong?.state != song.state || currentSong?.track != song.track || currentSong?.artist != song.artist || currentSong?.album != song.album || currentSong?.startedAt != song.startedAt)) await update();
	}
};


const main = async () => {
	await discord.ready();
	await processBlender();
	await processPronote();
	await processTrack(await getCurrentTrackInfo());
	await processWarThunder();

	setTimeout(main, 2500);
};

main();