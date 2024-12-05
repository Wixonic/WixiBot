const wl = require("@darrellvs/node-wave-link-sdk");

const log = require("../log.js");
const { abort, wait } = require("../utils.js");

let ready = false;

const wlController = new wl.WaveLinkController();

let volume = 0.15;

(async () => {
	log("[WaveLink] Connecting...");
	await wlController.connect();

	Promise.race([
		await wlController.connect(),
		abort(10)
	]).then(() => {
		log("[WaveLink] Connected.");

		const input = wlController.getInput({
			name: "Music"
		});

		volume = input.localVolume;
		input.on("localVolumeChanged", (localVolume) => {
			log(`[WaveLink] Volume transitioned from ${volume}% to ${localVolume / 100}%.`)
			volume = localVolume / 100;
		});

		ready = true
	}).catch(() => {
		log("[WaveLink] Failed to connect, using fallback volume value.");
		ready = true;
	});
})();

module.exports = {
	ready: async () => {
		while (!ready) {
			await wait(0.1);
		}

		return true;
	},
	get volume() {
		return volume;
	}
};