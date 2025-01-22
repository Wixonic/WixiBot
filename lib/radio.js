const { randomUUID } = require("crypto");
const { ActivityType } = require("discord.js");
const { AudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus } = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
const ytdl = require("@distube/ytdl-core");

const { client } = require("../clients.js");
const log = require("../log.js");
const { downloadImage, getDominantColor } = require("../utils.js");

const spotify = require("./spotify.js");
const youtube = require("./youtube.js");

const config = require("../config.js");

if (fs.existsSync(config.cache.radio)) fs.rmSync(config.cache.radio, { recursive: true });
fs.mkdirSync(config.cache.radio, { recursive: true });

const Radio = {
	audioPlayer: new AudioPlayer({
		behaviors: {
			noSubscriber: NoSubscriberBehavior.Play
		}
	}),

	/**
	 * @type {import("discord.js").VoiceBasedChannel?}
	 */
	channel: null,

	/**
	 * @type {import("@discordjs/voice").VoiceConnection?}
	 */
	connection: null,

	/**
	 * @type {import("@discordjs/voice").AudioResource?}
	 */
	resource: null,

	/**
	 * @type {import("../types.js").Song?}
	 */
	song: null,

	volumeEqualizer: 0.1,
	volume: 50,

	/**
	 * @type {import("../types.js").Song[]}
	 */
	waitingList: [],

	previousState: null,

	engine: () => {
		Radio.refresh();
		setTimeout(() => Radio.engine(), 1000);
	},

	refresh: () => {
		if (Radio.song == null || Radio.resource?.ended) {
			if (Radio.waitingList.length > 0) Radio.play(Radio.waitingList.shift())
			else Radio.clearActivity();
		}
	},

	/**
	 * @param {import("discord.js").VoiceBasedChannel} channel
	 */
	async join(channel) {
		Radio.channel = channel;

		try {
			Radio.connection = joinVoiceChannel({
				channelId: Radio.channel.id,
				guildId: Radio.channel.guild.id,
				adapterCreator: Radio.channel.guild.voiceAdapterCreator,
				selfDeaf: true,
				selfMute: false
			});

			Radio.connection.on("stateChange", (oldState, newState) => {
				if (oldState.status != newState.status) Radio.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);
			});

			Radio.connection.on(VoiceConnectionStatus.Disconnected, async () => {
				try {
					await Promise.race([
						entersState(Radio.connection, VoiceConnectionStatus.Signalling, 5000),
						entersState(Radio.connection, VoiceConnectionStatus.Connecting, 5000)
					]);
				} catch (error) {
					Radio.quit();
				}
			});
			Radio.connection.on(VoiceConnectionStatus.Destroyed, Radio.quit);

			Radio.connection.subscribe(Radio.audioPlayer);

			if (Radio.connection.state.status !== VoiceConnectionStatus.Ready) await entersState(Radio.connection, VoiceConnectionStatus.Ready, 10000);

			Radio.log("Ready.");
			return true;
		} catch (e) {
			Radio.quit();
			Radio.error(`Failed to launch radio: ${e}`);
			return false;
		}
	},

	quit() {
		Radio.stop(true);

		Radio.channel = null;

		try {
			Radio.connection?.destroy();
		} catch {
			Radio.log("Connection already destroyed.");
		}
		Radio.connection = null;
	},

	/**
	 * @param {import("../types.js").Song} song 
	 */
	play(song) {
		try {
			song.state = "PLAYING";

			Radio.resource = createAudioResource(fs.createReadStream(song.path), {
				inlineVolume: true
			});
			Radio.resource.volume.setVolume(Radio.volume * Radio.volumeEqualizer * 0.01);
			Radio.audioPlayer.play(Radio.resource);

			song.startedAt = Date.now();
			song.duration = Radio.resource.playbackDuration;

			Radio.song = song;
			Radio.setActivity();
			Radio.log(`Playing ${song.track} by ${song.artist} at volume ${Radio.volume}%`);
		} catch (e) {
			Radio.error(`Failed to play ${song.track} by ${song.artist} (at ${song.path}): ${e}`);
			Radio.skip(true);
		}
	},

	stop(force = false) {
		const status = Radio.audioPlayer.stop(true);
		if (status || force) {
			Radio.log("Radio stopped.");
			Radio.resource = null;
			Radio.song = null;
			Radio.waitingList = [];
		} else Radio.error("Failed to stop radio.");
		return status;
	},

	next(force = false) {
		const status = Radio.audioPlayer.stop(true);
		if (status || force) {
			Radio.log(`Skipped ${Radio.song.track} by ${Radio.song.artist}.`);
			Radio.resource = null;
			Radio.song = null;
		} else Radio.error("Failed to skip song.");
		return status;
	},

	pause() {
		const status = Radio.audioPlayer.pause(true);
		if (status) {
			Radio.song.state = "PAUSED";
			Radio.song.pausedAt = Date.now();
			Radio.log("Song paused.");
		} else Radio.error("Failed to pause song.");
		return status;
	},

	resume() {
		const status = Radio.audioPlayer.unpause();
		if (status) {
			Radio.song.state = "PLAYING";
			Radio.song.startedAt += Date.now() - Radio.song.pausedAt;
			Radio.log("Song resumed.");
		} else Radio.error("Failed to resume song.");
		return status;
	},

	/**
	 * @param {string?} query 
	 */
	async search(query) {
		const [
			spotifyTrack,
			youtubeVideo
		] = await Promise.all([
			spotify.search(query),
			youtube.search(query)
		]);

		return await Radio.songFromYouTubeAndSpotify(spotifyTrack, youtubeVideo?.id?.videoId);
	},

	/**
	 * @param {string?} videoId 
	 */
	async get(videoId) {
		const youtubeVideo = await youtube.get(videoId);
		const spotifyTrack = await spotify.search(`${youtubeVideo?.snippet?.title} ${youtubeVideo?.snippet?.channelTitle}`);

		return await Radio.songFromYouTubeAndSpotify(spotifyTrack, videoId);
	},

	async songFromYouTubeAndSpotify(spotifyTrack, videoId) {
		/**
		 * @type {import("../types.js").Song}
		 */
		const song = {};

		song.track = spotifyTrack?.name ?? "Unknown song";
		song.artist = "";
		for (const id in spotifyTrack?.artists) song.artist += (id == 0 ? "" : (id == spotifyTrack.artists.length - 1 ? " & " : ", ")) + (spotifyTrack.artists[id].name ?? "Unknown artist");
		song.album = spotifyTrack?.album?.name ?? "Unknown album";
		song.state = "STOPPED";
		song.spotifyArtworkURL = spotifyTrack?.album?.images?.at(0)?.url
		song.spotifyArtwork = song.spotifyArtworkURL?.slice((song.spotifyArtworkURL?.lastIndexOf("/") ?? -1) + 1) ?? null;

		song.youtubeId = videoId ?? "dQw4w9WgXcQ";

		try {
			song.color = await getDominantColor(await downloadImage(song.spotifyArtworkURL));
		} catch (e) {
			Radio.error(`Error while getting color: ${e}`);
		}

		return song;
	},

	/**
	 * @param {import("../types.js").Song} song
	 */
	async load(song) {
		song.path = path.join(config.cache.radio, randomUUID() + ".webm");

		try {
			await new Promise((resolve, reject) => {
				const stream = ytdl(`https://www.youtube.com/watch?v=${song.youtubeId}`, {
					filter: "audioonly",
					quality: "highestaudio"
				});
				stream.pipe(fs.createWriteStream(song.path));
				stream.on("finish", resolve);
				stream.on("error", reject);
			});

			Radio.waitingList.push(song);

			return song;
		} catch (e) {
			Radio.error(`Failed to load ${song.track} by ${song.artist} (at ${song.path}): ${e}`);
			return null;
		}
	},

	setVolume: (volume = 20) => {
		Radio.volume = Math.round(volume);
		if (Radio.resource) Radio.resource.volume.setVolume(Radio.volume * Radio.volumeEqualizer * 0.01);
	},

	setActivity: () => {
		client.user.setActivity({
			name: Radio.song.track,
			state: Radio.song.artist,
			type: ActivityType.Listening
		});
	},

	clearActivity: () => client.setDefaultActivity(),

	log: (any) => log(`Radio - ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`),
	error: (any) => log.error(`Radio - ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`)
};

Radio.audioPlayer.on("stateChange", (oldState, newState) => {
	if (oldState.status != newState.status) Radio.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
});

Radio.audioPlayer.on("error", (e) => {
	Radio.error(`Error in audio player: ${e.message}`);
});

Radio.engine();

module.exports = Radio;