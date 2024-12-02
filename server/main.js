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

	getCurrentTrackInfo(async (error, song) => {
		const update = async () => {
			if (discord.activities.length > 0) discord.removeActivity("music");

			console.log(`Updating music with ${error ? "nothing" : song.trackName ?? "unknown"}${currentVolume != wavelink.volume ? ` at volume ${wavelink.volume}%` : ""}`);
			currentSong = error ? null : song;
			currentVolume = wavelink.volume;

			if (error) await db.collection("activity").doc("song").delete();
			else {

				let ytId = "dQw4w9WgXcQ";
				try {
					ytId = await youtube.search(`${song.trackName} ${song.artistName}`);
				} catch (e) {
					console.error(e);
				}

				await db.collection("activity").doc("song").set({
					track: song.trackName,
					artist: song.artistName,
					album: song.albumName,
					volume: wavelink.volume / 100,
					url: `https://www.youtube.com/watch?v=${ytId}`
				});

				const spotifySong = await spotify.search(`${song.trackName} ${song.artistName}`);
				const spotifyTrackImage = spotifySong?.album?.images?.at(0)?.url;

				discord.addActivity("music", {
					flags: 48,
					assets: {
						large_image: `spotify:${spotifyTrackImage.slice(spotifyTrackImage.lastIndexOf("/") + 1)}`,
						large_text: song.albumName,
						small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.id}/${config.discord.application.assets.apple_music}.png`,
						small_text: "Apple Music",
					},
					name: song.trackName,
					details: song.trackName,
					state: song.artistName,
					type: 2 // LISTENING
				});
			}
		};

		if (error) {
			if (currentSong != null || currentVolume != wavelink.volume) await update();
		} else {
			if (currentSong == null || (currentSong?.trackName != song.trackName || currentSong?.artistName != song.artistName || currentSong?.albumName != song.albumName) || currentVolume != wavelink.volume) await update();
		}

		setTimeout(main, 2500);
	});
};

main();