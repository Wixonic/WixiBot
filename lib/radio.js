const { ActivityType } = require("discord.js");
const { AudioPlayer, AudioPlayerStatus, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const fs = require("fs");
// const ytdl = require("ytdl-core");
const ytdl = require("@distube/ytdl-core");

const { client } = require("../clients.js");
const log = require("../log.js");

const config = require("../config.js");

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

			client.user.setActivity({
				assets: {
					large_image: `spotify:${song.spotifyArtwork}`,
					large_text: song.album,
					small_image: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`,
					small_text: "YouTube",
				},
				buttons: [
					{
						label: "Watch on YouTube",
						url: `https://www.youtube.com/watch?v=${song.youtubeId}`
					}
				],
				timestamps: {
					start: song.startedAt,
					end: song.startedAt + song.duration
				},
				name: song.track,
				details: song.track,
				state: song.album,
				type: ActivityType.Listening
			});

			Radio.song = song;
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
		if (status) Radio.song.state = "PAUSED";
		Radio.log(status ? "Song paused." : "Failed to pause song.");
		return status;
	},

	resume() {
		const status = Radio.audioPlayer.unpause();
		if (status) Radio.song.state = "PLAYING";
		Radio.log(status ? "Song resumed." : "Failed to resume song.");
		return status;
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