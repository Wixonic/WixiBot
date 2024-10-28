const applescript = require("applescript");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const wl = require("@darrellvs/node-wave-link-sdk");
const ytsr = require("ytsr");

const config = require("./config.js");

(async () => {
	initializeApp({
		credential: cert(config.firebase)
	});

	const db = getFirestore();

	const wlController = new wl.WaveLinkController();
	await wlController.connect();

	const input = wlController.getInput({
		name: "Music"
	});

	let volume = input.localVolume;
	input.on("localVolumeChanged", (volume) => volume = inputVolume);

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
	return {null, null, null}
end if`;

		applescript.execString(script, (e, result) => {
			if (e) {
				callback(true, {
					trackName: null,
					artistName: null,
					albumName: null
				});
				return;
			}

			const [
				trackName,
				artistName,
				albumName
			] = result;

			callback(trackName == null && artistName == null && albumName == null, {
				trackName,
				artistName,
				albumName
			});
		});
	};

	let currentSong = null;

	const main = () => {
		getCurrentTrackInfo(async (error, song) => {
			const update = async () => {
				console.log(`Updating music with ${song?.trackName ?? "nothing"}`);
				if (song) {
					const result = await ytsr(`${song.trackName} ${song.artistName}`, {
						limit: 1,
						safeSearch: true
					});

					let url = null;

					try {
						url = result.items[0].url;
					} catch {
						url = "https://www.youtube.com";
					}

					await db.collection("activity").doc("song").set({
						track: song.trackName,
						artist: song.artistName,
						album: song.albumName,
						volume: volume / 100,
						url
					});
				} else await db.collection("activity").doc("song").delete();
			};

			if (error) {
				if (currentSong != null) await update();
			} else {
				if (currentSong?.trackName != song.trackName || currentSong?.artistName != song.artistName || currentSong?.albumName != song.albumName) await update();
			}

			currentSong = song;

			setTimeout(main, 2500);
		});
	};

	main();
})();