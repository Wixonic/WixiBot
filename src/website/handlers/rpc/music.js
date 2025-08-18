const { getCurrentTrackInfo } = require("../../../lib/music.js");
const spotify = require("../../../lib/spotify.js");

/**
 * @type {import("../../../types.d.ts").Song?}
 */
let clientSong = null;

/**
 * @type {import("../../../types.d.ts").Song?}
 */
let serverSong = null;

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

			const update = async () => {
				if (song == null) {
					currentSong = null;
					rpc.removeActivity("music");
				} else if ((currentSong?.state != "PAUSED" && song.state == "PAUSED") || song.state != "PAUSED") {
					if (song.state == "PAUSED" && currentSong) {
						song = currentSong;
						currentSong.state = "PAUSED";
					} else {
						const spotifySong = (await spotify.search(logger, settings.rpc.spotify, `artist:${song.artist} track:${song.track}`)) ?? null;
						song.spotifyId = spotifySong?.id ?? null;
						const spotifyArtworkUrl = spotifySong?.album?.images?.at(0)?.url;
						song.spotifyArtwork = spotifyArtworkUrl?.slice((spotifyArtworkUrl?.lastIndexOf("/") ?? -1) + 1) ?? null;
					}

					currentSong = song;

					if (song.state == "PLAYING") {
						rpc.addActivity("music", {
							applicationId: settings.rpc.discord.application.clients.apple_music.id,
							assets: {
								large_image: `spotify:${song.spotifyArtwork}`,
								large_text: song.album,
								small_image: settings.rpc.discord.application.clients.apple_music.assets.icon,
								small_text: "Apple Music"
							},
							buttons: [
								"My profile",
								"My website"
							],
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
				}
			};

			const needsUpdate = () => (song == null && currentSong != null) ||
				(song != null &&
					(currentSong == null ||
						currentSong.state != song.state ||
						currentSong.track != song.track ||
						currentSong.artist != song.artist ||
						currentSong.album != song.album ||
						Math.floor(currentSong.startedAt / 10000) != Math.floor(song.startedAt / 10000)));

			if (needsUpdate()) await update();
			return false;
		}
	}
};

module.exports = info;