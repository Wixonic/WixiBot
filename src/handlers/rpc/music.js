const spotify = require("../../lib/spotify.js");

/**
 * @type {import("../../types.d.ts").Song?}
 */
let currentSong = null;

/**
 * @type {import("../../types.d.ts").Song?}
 */
let song = null;

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/music/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/music]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			try {
				song = JSON.parse(req.body);
				res.status(204).end();
			} catch (e) {
				logger.warn("[rpc/music]", e);
				song = null;
				res.status(400).end();
			}
		},
		delete: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/music]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			song = null;

			res.status(204).end();
		}
	},
	loop: {
		delay: 2 * 1000,
		process: async (logger, settings, bot, rpc, sdk) => {
			if (song?.state === "PAUSED" && currentSong) song = { ...currentSong, state: "PAUSED" };

			const needsUpdate = () => {
				if (song === null && currentSong === null) return false;
				else if (song === null || currentSong === null) return true;
				return song.track !== currentSong.track ||
					song.artist !== currentSong.artist ||
					song.state !== currentSong.state ||
					Math.floor(currentSong.startedAt / 2000) !== Math.floor(song.startedAt / 2000);
			};

			if (needsUpdate()) {
				if (song === null || song.state === "STOPPED") {
					rpc.removeActivity("music");
					currentSong = null;
					return true;
				}

				if (!currentSong || currentSong.track !== song.track || currentSong.artist !== song.artist) {
					const spotifySong = (await spotify.search(logger, settings.rpc.spotify, `artist:${song.artist} track:${song.track}`)) ?? null;
					song.spotifyId = spotifySong?.id ?? null;
					const spotifyArtworkUrl = spotifySong?.album?.images?.at(0)?.url;
					song.spotifyArtwork = spotifyArtworkUrl?.slice((spotifyArtworkUrl?.lastIndexOf("/") ?? -1) + 1) ?? null;
				} else {
					song.spotifyId = currentSong.spotifyId;
					song.spotifyArtwork = currentSong.spotifyArtwork;
				}

				currentSong = song;

				if (currentSong.state === "PLAYING") {
					rpc.addActivity("music", {
						applicationId: settings.rpc.discord.application.clients.apple_music.id,
						assets: {
							large_image: currentSong.spotifyArtwork ? `spotify:${currentSong.spotifyArtwork}` : settings.rpc.discord.application.clients.apple_music.assets.icon,
							large_text: currentSong.album,
							small_image: settings.rpc.discord.application.clients.apple_music.assets.icon,
							small_text: "Apple Music"
						},
						buttons: ["My profile", "My website"],
						metadata: {
							button_urls: [
								"https://music.apple.com/profile/wixonic",
								"https://wixonic.fr"
							]
						},
						timestamps: {
							start: currentSong.startedAt,
							end: currentSong.startedAt + currentSong.duration
						},
						name: currentSong.track,
						details: currentSong.track,
						state: currentSong.artist,
						type: "LISTENING"
					});
				} else rpc.removeActivity("music");
			}
			return false;
		}
	}
};

module.exports = info;