const { ChannelType } = require("discord.js");
const { AudioPlayer, AudioPlayerStatus, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");
// const ytdl = require("ytdl-core");
const ytdl = require("@distube/ytdl-core");

const { client } = require("../clients.js");
const log = require("../log.js");

const config = require("../config.js");

initializeApp({
	credential: cert(config.firebase)
});

const db = getFirestore();
const doc = db.collection("activity").doc("song");

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
	 * @type {() => void}
	 */
	observer: null,

	/**
	 * @type {import("@discordjs/voice").AudioResource?}
	 */
	resource: null,

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
				if (oldState.status != newState.status) log(`Radio's connection transitioned from ${oldState.status} to ${newState.status}`);
			});

			Radio.connection.on(VoiceConnectionStatus.Disconnected, async () => {
				try {
					await Promise.race([
						entersState(Radio.connection, VoiceConnectionStatus.Signalling, 5000),
						entersState(Radio.connection, VoiceConnectionStatus.Connecting, 5000)
					]);
				} catch (error) {
					Radio.connection.destroy();
				}
			});
			Radio.connection.on(VoiceConnectionStatus.Destroyed, Radio.quit);

			Radio.connection.subscribe(Radio.audioPlayer);

			let previousSong = null;
			Radio.observer = doc.onSnapshot(async (snapshot) => {
				const song = snapshot.data();
				if (!song || !song.url) {
					Radio.audioPlayer.stop();
					return;
				}

				if (song.url == previousSong?.url) {
					Radio.audioPlayer.stop();

					const filePath = "/tmp/wixibot-radio.mp3";

					log(`Loading ${song.trackName} by ${song.artistName}`);
					try {
						await new Promise((resolve, reject) => {
							const stream = ytdl(song.url, {
								filter: "audioonly",
								quality: "highestaudio"
							});

							stream.pipe(fs.createWriteStream(filePath));
							stream.on("finish", resolve);
							stream.on("error", reject);
						});

						Radio.resource = createAudioResource(fs.createReadStream(filePath), {
							inlineVolume: true
						});
						Radio.resource.volume.setVolume(song.volume / 2);
						Radio.audioPlayer.play(Radio.resource);
						log(`Playing ${song.track} by ${song.artist} at volume ${song.volume * 100}%`);
					} catch (e) {
						log(`Failed to load ${song.track} by ${song.artist} (${song.url}) -  ${e}`);
					}
				} else Radio.resource.volume.setVolume(song.volume / 2);
			});

			if (Radio.connection.state.status !== VoiceConnectionStatus.Ready) await entersState(Radio.connection, VoiceConnectionStatus.Ready, 10000);

			log("Radio's connection is ready to play");

			return true;
		} catch (e) {
			log(`Failed to launch radio: ${e}`);
			await Radio.quit();
			return false;
		}
	},

	async quit() {
		Radio.channel = null;

		try {
			Radio.connection?.destroy();
		} catch {
			log("Radio - Connection already destroyed");
		}
		Radio.connection = null;

		try {
			Radio.observer();
		} catch {
			log("Radio - Observer already destroyed");
		}
		Radio.observer = null;
	}
};

Radio.audioPlayer.on("stateChange", (oldState, newState) => {
	if (oldState.status != newState.status) log(`Radio's audio player transitioned from ${oldState.status} to ${newState.status}`);
});

Radio.audioPlayer.on("error", (e) => {
	log(`Error in audio player: ${e.message}`);
});

module.exports = Radio;