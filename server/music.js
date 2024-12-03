const applescript = require("applescript");

const config = require("./config.js");

const getCurrentTrackInfo = (callback) => {
	const script = `
if application "Music" is running then
	tell application "Music"
		set playerState to player state
		if playerState is playing then
			set currentTrack to current track
			set trackName to name of currentTrack
			set artistName to artist of currentTrack
			set albumName to album of currentTrack
			set startedAt to player position
			set trackDuration to duration of currentTrack
			
			try
				set artworkData to data of artwork 1 of currentTrack
				set artworkURL to (open for access (POSIX file "${config.artworkPath}") with write permission)
				write artworkData to artworkURL
				close access artworkURL
			end try
			
			return {"Playing", trackName, artistName, albumName, startedAt, trackDuration}
		else
			return {"Stopped", "", "", "", 0, 0}
		end if
	end tell
else
	return {"Stopped", "", "", "", 0, 0}
end if`;

	applescript.execString(script, (e, result) => {
		if (e || result[0] != "Playing") {
			callback(null);
		} else {
			const [
				state,
				trackName,
				artistName,
				albumName,
				startedAt,
				duration
			] = result;

			callback({
				state,
				trackName: trackName == "" ? "unknown track" : trackName,
				artistName: artistName == "" ? "unknown artist" : artistName,
				albumName: albumName == "" ? "unknown album" : albumName,
				artworkPath: config.artworkPath,
				startedAt: Math.floor(Date.now() * 1e-3 - startedAt) * 1e3,
				duration: Math.floor(duration * 1e3)
			});
		}
	});
};

module.exports = {
	getCurrentTrackInfo
};