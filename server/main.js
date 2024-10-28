const applescript = require("applescript");
const express = require("express");

const config = require("./config.js");

const app = express();

const getCurrentTrackInfo = (callback) => {
	const script = `
    tell application "Music"
        set currentTrack to current track
        set trackName to name of currentTrack
        set artistName to artist of currentTrack
        set albumName to album of currentTrack

        try
            set artworkData to data of artwork 1 of currentTrack
            set artworkURL to (open for access (POSIX file "${config.artworkPath}") with write permission)
            write artworkData to artworkURL
            close access artworkURL
        end try

        return {trackName, artistName, albumName}
    end tell`;

	applescript.execString(script, (e, result) => {
		if (e) {
			callback(e, null);
			return;
		}

		const [
			trackName,
			artistName,
			albumName,
			artworkURL
		] = result;

		callback(null, {
			success: true,
			trackName,
			artistName,
			albumName,
			artworkURL
		});
	});
};

app.get("/song", (_, res) => {
	getCurrentTrackInfo((e, trackInfo) => {
		if (e) return res.status(204).json({
			success: false,
			trackName: null,
			artistName: null,
			albumName: null,
			artworkURL: null
		});

		res.json(trackInfo);
	});
});

app.get("/song/artwork.jpg", (_, res) => {
	res.setHeader("Cache-Control", "no-cache");
	res.sendFile(config.artworkPath, (e) => {
		if (e) res.status(404).send("Not Found");
	});
});

app.listen(config.port, () => console.log(`Server running on localhost:${config.port}`));