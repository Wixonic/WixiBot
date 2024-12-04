const log = require("../log.js");

const discord = require("./client.js");
const { db } = require("./firebase.js");
const { getCurrentTrackInfo } = require("./music.js");
const spotify = require("./spotify.js");
const wavelink = require("./wavelink.js");

const config = require("../config.js");

/**
 * @type {import("../types.js").Song?}
 */
let currentSong = null;

const main = async () => {
	await Promise.all([
		discord.ready(),
		wavelink.ready()
	]);

	/**
	 * @param {import("../types.js").Song?} song 
	 */
	const processTrack = async (song) => {
		const update = async () => {
			if (discord.activities.length > 0) discord.removeActivity("music");

			if (song == null) {
				log("Music stopped.");

				currentSong = null;
				await db.collection("activity").doc("song").delete();

				discord.removeActivity("music");
			} else {
				log(`Music set to ${song.track} by ${song.artist} at volume ${song.volume}%.`);

				const spotifySong = (await spotify.search(`${song.track} ${song.artist} ${song.album}`)) ?? null;
				song.spotifyId = spotifySong?.id ?? null;
				const spotifyArtworkUrl = spotifySong?.album?.images?.at(0)?.url;
				song.spotifyArtwork = spotifyArtworkUrl?.slice((spotifyArtworkUrl?.lastIndexOf("/") ?? -1) + 1) ?? null;

				await db.collection("activity").doc("song").set(song);

				if (song.state == "PLAYING") {
					discord.addActivity("music", {
						assets: {
							large_image: `spotify:${song.spotifyArtwork}`,
							large_text: song.album,
							small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.apple_music}.png`,
							small_text: "Apple Music",
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
				}

				currentSong = song;
			}
		};

		if (song == null) {
			if (currentSong != null) await update();
		} else {
			song.volume = wavelink.volume;

			if (currentSong == null || (currentSong?.state != song.state || currentSong?.track != song.track || currentSong?.artist != song.artist || currentSong?.album != song.album || currentSong?.startedAt != song.startedAt) || song.volume != wavelink.volume) await update();
		}

		setTimeout(main, 2500);
	};

	getCurrentTrackInfo(processTrack);
};

main();