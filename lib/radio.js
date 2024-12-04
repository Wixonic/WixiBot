const { randomUUID } = require("crypto");
const { ActivityType } = require("discord.js");
const { AudioPlayer, AudioPlayerStatus, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
// const ytdl = require("ytdl-core");
const ytdl = require("@distube/ytdl-core");

const { client } = require("../clients.js");
const log = require("../log.js");
const { downloadImage, getDominantColor } = require("../utils.js");

const spotify = require("./spotify.js");
const youtube = require("./youtube.js");

const config = require("../config.js");

fs.rmSync(config.cache.radio, {
	force: true,
	recursive: true
});

fs.mkdirSync(config.cache.radio, {
	recursive: true
});

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

	/**
	 * @type {import("../types.js").Song[]}
	 */
	waitingList: [],

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
			Radio.log(`Failed to launch radio: ${e}`);
			return false;
		}
	},

	quit() {
		Radio.stop();

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
			Radio.resource.volume.setVolume(song.volume / 10);
			Radio.audioPlayer.play(Radio.resource);

			song.startedAt = Date.now();
			song.duration = Radio.resource.playbackDuration;

			Radio.song = song;
			Radio.setActivity();
			Radio.log(`Playing ${song.track} by ${song.artist} at volume ${song.volume * 100}%`);
		} catch {
			Radio.log(`Failed to play ${song.track} by ${song.artist} (at ${song.path})`);
			Radio.stop();
		}
	},

	stop() {
		if (Radio.audioPlayer.stop(true)) Radio.log("Radio stopped.");
		else Radio.log("Failed to stop radio.");
		Radio.resource = null;
	},

	pause() {
		const status = Radio.audioPlayer.pause(true);
		if (status) {
			Radio.song.state = "PAUSED";
			Radio.song.pausedAt = Date.now();

			Radio.setActivity(false);
		}
		Radio.log(status ? "Song paused." : "Failed to pause song.");
		return status;
	},

	resume() {
		const status = Radio.audioPlayer.unpause();
		if (status) {
			Radio.song.state = "PLAYING";
			Radio.song.startedAt += Date.now() - Radio.song.pausedAt;

			Radio.setActivity();
		}
		Radio.log(status ? "Song resumed." : "Failed to resume song.");
		return status;
	},

	/**
	 * @param {string?} query 
	 */
	async search(query) {
		/**
		 * @type {import("../types.js").Song}
		 */
		const song = {};

		const [
			spotifyTrack,
			youtubeVideo
		] = await Promise.all([
			spotify.search(query),
			youtube.search(query)
		]);

		song.track = spotifyTrack?.name ?? "Unknown song";
		song.artist = "";
		for (const id in spotifyTrack?.artists) song.artist += (id == 0 ? "" : (id == spotifyTrack.artists.length - 1 ? " & " : ", ")) + (spotifyTrack.artists[id].name ?? "Unknown artist");
		song.album = spotifyTrack?.album?.name ?? "Unknown album";
		song.state = "STOPPED";
		song.spotifyArtworkURL = spotifyTrack?.album?.images?.at(0)?.url
		song.spotifyArtwork = song.spotifyArtworkURL?.slice((song.spotifyArtworkURL?.lastIndexOf("/") ?? -1) + 1) ?? null;

		song.youtubeId = youtubeVideo?.id?.videoId ?? "dQw4w9WgXcQ";

		try {
			song.color = await getDominantColor(await downloadImage(song.spotifyArtworkURL));
		} catch (e) {
			log(e);
		}

		return song;
	},

	/**
	 * @param {import("../types.js").Song} song
	 */
	async load(song) {
		song.path = path.join(config.cache.radio, randomUUID());

		ytdl()

		Radio.waitingList.push(song);

		return song;
	},

	/** 
	* @param { false } timestamps
	*/
	setActivity: (timestamps = true) => {
		const activity = {
			assets: {
				large_image: `spotify: ${Radio.song.spotifyArtwork}`,
				large_text: Radio.song.album,
				small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`,
				small_text: "YouTube",
			},
			buttons: [
				{
					label: "Watch on YouTube",
					url: `https://www.youtube.com/watch?v=${Radio.song.youtubeId}`
				}
			],
			name: Radio.song.track,
			details: Radio.song.track,
			state: Radio.song.album,
			type: ActivityType.Listening
		};

		if (timestamps) activity.timestamps = {
			start: Radio.song.startedAt,
			end: Radio.song.startedAt + Radio.song.duration
		};

		client.user.setActivity(activity);
	},

	log: (any) => log(`Radio - ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`)
};

Radio.audioPlayer.on("stateChange", (oldState, newState) => {
	if (oldState.status != newState.status) {
		if (newState.status == AudioPlayerStatus.Idle) client.user.setActivity({
			name: "/help",
			type: ActivityType.Custom
		});
		Radio.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
	}
});

Radio.audioPlayer.on("error", (e) => {
	Radio.log(`Error in audio player: ${e.message}`);
});

module.exports = Radio;