const discord = require("./client.js");
const { db } = require("./firebase.js");
const { getCurrentTrackInfo } = require("./music.js");
const spotify = require("./spotify.js");
const youtube = require("./youtube.js");
const wavelink = require("./wavelink.js");
const config = require("./config.js");

let currentSong = null;
let currentVolume = 0;

const main = async () => {
	await Promise.all([
		discord.ready(),
		wavelink.ready()
	]);

	getCurrentTrackInfo(async (song) => {
		const update = async () => {
			if (discord.activities.length > 0) discord.removeActivity("music");

			currentSong = song;
			currentVolume = wavelink.volume;

			if (song == null) {
				console.log("Music stopped");
				await db.collection("activity").doc("song").delete();
				discord.removeActivity("music");
			} else {
				console.log(`Music set to ${song.trackName} by ${song.artistName} at volume ${currentVolume}%`);

				let ytId = "dQw4w9WgXcQ";
				try {
					ytId = await youtube.search(`${song.trackName} ${song.artistName}`);
				} catch (e) {
					console.error(e);
				}

				const spotifySong = (await spotify.search(`${song.trackName} ${song.artistName} ${song.albumName}`)) ?? null;
				const spotifyTrackArtwork = spotifySong?.album?.images?.at(0)?.url ?? null;

				await db.collection("activity").doc("song").set({
					track: song.trackName,
					artist: song.artistName,
					album: song.albumName,
					startedAt: song.startedAt,
					duration: song.duration,
					volume: wavelink.volume / 100,
					spotifyArtwork: spotifyTrackArtwork?.slice((spotifyTrackArtwork?.lastIndexOf("/") ?? -1) + 1) ?? null,
					url: `https://www.youtube.com/watch?v=${ytId}`
				});

				discord.addActivity("music", {
					assets: {
						large_image: `spotify:${spotifyTrackArtwork?.slice((spotifyTrackArtwork?.lastIndexOf("/") ?? -1) + 1) ?? "0"}`,
						large_text: song.albumName,
						small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.id}/${config.discord.application.assets.apple_music}.png`,
						small_text: "Apple Music",
					},
					/* buttons: [{
						label: "Watch on YouTube",
						url: `https://www.youtube.com/watch?v=${ytId}`
					}], */
					timestamps: {
						start: song.startedAt,
						end: song.startedAt + song.duration
					},
					name: song.trackName,
					details: song.trackName,
					state: song.artistName,
					type: 2 // LISTENING
				});
			}
		};

		if (song == null) {
			if (currentSong != null) await update();
		} else {
			if (currentSong == null || (currentSong?.trackName != song.trackName || currentSong?.artistName != song.artistName || currentSong?.albumName != song.albumName || currentSong?.startedAt != song.startedAt || currentSong?.state != song.state) || currentVolume != wavelink.volume) await update();
		}

		setTimeout(main, 2500);
	});
};

main();