const applescript = require("applescript");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const wl = require("@darrellvs/node-wave-link-sdk");
const path = require("path");

const youtube = require("./youtube.js");

const config = require("./config.js");

(async () => {
	initializeApp({
		credential: cert(config.firebase)
	});

	const db = getFirestore();

	const wlController = new wl.WaveLinkController();
	console.log("Connecting to WaveLink...");
	Promise.race([
		await wlController.connect(),
		new Promise((_, reject) => setTimeout(reject, 10000))
	]).then(() => {
		console.log("WaveLink connected");

		const input = wlController.getInput({
			name: "Music"
		});

		let volume = input.localVolume;
		input.on("localVolumeChanged", (localVolume) => volume = localVolume);

		const getCurrentTrackInfo = (callback) => {
			const script = `
	if application "Music" is running then
		tell application "Music"
			set currentTrack to current track
			set trackName to name of currentTrack
			set artistName to artist of currentTrack
			set albumName to album of currentTrack
	
			return {trackName, artistName, albumName}
		end tell
	else
		return {"", "", ""}
	end if`;

			applescript.execString(script, (e, result) => {
				if (e) {
					callback(true, {
						trackName: null,
						artistName: null,
						albumName: null
					});
				} else {
					const [
						trackName,
						artistName,
						albumName
					] = result;

					callback(trackName == "" && artistName == "" && albumName == "", {
						trackName,
						artistName,
						albumName
					});
				}
			});
		};

		let currentSong = null;
		let currentVolume = 0;

		const main = () => {
			getCurrentTrackInfo(async (error, song) => {
				const update = async () => {
					console.log(`Updating music with ${error ? "nothing" : song.trackName ?? "unknown"}${currentVolume != volume ? ` at volume ${volume}%` : ""}`);
					currentSong = error ? null : song;
					currentVolume = volume;

					if (error) await db.collection("activity").doc("song").delete();
					else {
						let id = "dQw4w9WgXcQ";
						try {
							id = await youtube.search(`${song.trackName} ${song.artistName}`);
						} catch { }

						await db.collection("activity").doc("song").set({
							track: song.trackName,
							artist: song.artistName,
							album: song.albumName,
							volume: volume / 100,
							url: `https://www.youtube.com/watch?v=${id}`
						});
					}
				};

				if (error) {
					if (currentSong != null || currentVolume != volume) await update();
				} else {
					if (currentSong == null || (currentSong?.trackName != song.trackName || currentSong?.artistName != song.artistName || currentSong?.albumName != song.albumName) || currentVolume != volume) await update();
				}

				setTimeout(main, 2500);
			});
		};

		main();
	}).catch(() => {
		console.error("Failed to connect to WaveLink, exiting...");
		process.exit(1);
	});
})();