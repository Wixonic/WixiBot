const { getCurrentTrackInfo } = require("../../../lib/music.js");
const spotify = require("../../../lib/spotify.js");

/**
 * @type {import("../../../types.d.ts").Song?}
 */
let clientSong = null;

/**
 * @type {import("../../../types.d.ts").Song?}
 */
let currentSong = null;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/music/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/music]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			clientSong = req.body;

			res.status(204).end();
		},
		delete: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/music]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			clientSong = null;

			res.status(204).end();
		}
	},
	loop: {
		delay: 2 * 1000,
		process: async (logger, settings, bot, rpc) => {
			const song = clientSong ?? await getCurrentTrackInfo();

			const needsUpdate = () => {
				if (!song && !currentSong) return false;
				if (!song || !currentSong) return true;
				return song.track != currentSong.track ||
					song.artist != currentSong.artist ||
					song.album != currentSong.album ||
					song.state != currentSong.state;
			};

			if (needsUpdate()) {
				if (!song) {
					rpc.removeActivity("music");
					currentSong = null;
					return true;
				}

				if (currentSong && (song.track != currentSong.track || song.artist != currentSong.artist)) {
					const spotifySong = await spotify.search(logger, settings.rpc.spotify, `artist:${songSource.artist} track:${songSource.track}`);

					if (spotifySong) {
						songSource.spotifyId = spotifySong.id;
						const spotifyArtworkUrl = spotifySong.album?.images?.[0]?.url;
						if (spotifyArtworkUrl) {
							songSource.spotifyArtwork = spotifyArtworkUrl.slice(spotifyArtworkUrl.lastIndexOf("/") + 1);
						}
					}
				}

				if (song.state === "PLAYING") {
					rpc.addActivity("music", {
						applicationId: settings.rpc.discord.application.clients.apple_music.id,
						assets: {
							large_image: song.spotifyArtwork ? `spotify:${song.spotifyArtwork}` : settings.rpc.discord.application.clients.apple_music.assets.icon,
							large_text: song.album,
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
							start: song.startedAt,
							end: song.startedAt + song.duration
						},
						name: song.track,
						details: song.track,
						state: song.artist,
						type: "LISTENING"
					});
				} else rpc.removeActivity("music");

				currentSong = song;
			}
			return false;
		}
	}
};

module.exports = info;