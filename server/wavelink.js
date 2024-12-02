const wl = require("@darrellvs/node-wave-link-sdk");

const { abort, wait } = require("./utils.js");

let ready = false;

const wlController = new wl.WaveLinkController();

let volume = 20;

(async () => {
	console.log("Connecting to WaveLink...");
	await wlController.connect();

	Promise.race([
		await wlController.connect(),
		abort(10)
	]).then(() => {
		console.log("WaveLink connected");

		const input = wlController.getInput({
			name: "Music"
		});

		volume = input.localVolume;
		input.on("localVolumeChanged", (localVolume) => volume = localVolume);

		ready = true
	}).catch(() => {
		console.log("Failed to connect to WaveLink, using fallback volume value");
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