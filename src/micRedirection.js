const childProcess = require("child_process");

/**
 * @type {string[]}
 */
let deviceList = [];

const trimName = (name) => name.split("(")[0].replace(/\s\n\t/, " ").trim();

const updateDeviceList = () => {
	const result = childProcess.spawnSync("ffmpeg", [
		"-f", "lavfi",
		"-i", "anullsrc",
		"-t", "0.1",
		"-f", "audiotoolbox",
		"-list_devices", "true",
		"-"
	], { encoding: "utf8", stderr: "pipe" });

	deviceList = [];
	const output = result.stderr || result.stdout;

	for (const match of output.matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList[Number(match[1])] = trimName(match[2]);
};

module.exports = {
	run: () => {
		updateDeviceList();

		childProcess.spawn("ffmpeg", [
			"-loglevel", "error",
			"-i", "udp://@:5001",
			"-f", "audiotoolbox",
			"-audio_device_index", deviceList.findIndex((value) => value.startsWith("BlackHole Microphone")),
			"-"
		], { stdio: "inherit" });
	}
};