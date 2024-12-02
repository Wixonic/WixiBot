const applescript = require("applescript");

const config = require("./config.js");

const getCurrentTrackInfo = (callback) => {
	const script = `
if application "Music" is running then
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
	end tell
else
	return {"", "", ""}
end if`;

	applescript.execString(script, (e, result) => {
		if (e) {
			callback(true, {
				trackName: null,
				artistName: null,
				albumName: null,
				artwork: null
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
				albumName,
				artworkPath: config.artworkPath
			});
		}
	});
};

module.exports = {
	getCurrentTrackInfo
};