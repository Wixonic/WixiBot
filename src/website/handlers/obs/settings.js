const childProcess = require("child_process");
const { log } = require("@wixonic/logger");

/**
 * @type {{audio: string[], video: string[]}}
 */
const deviceList = {
	audio: [],
	video: []
};

const trimName = (name) => name.split("(")[0].replace(/\s\n\t/, " ").trim();

const updateDeviceList = () => {
	const result = childProcess.spawnSync("ffmpeg", [
		"-f", "avfoundation",
		"-list_devices", "true",
		"-i", ""
	], { encoding: "utf8" });

	deviceList.audio = [];
	deviceList.video = [];
	const output = (result.stderr || result.stdout).split("AVFoundation audio devices");

	for (const match of output[0].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.video[Number(match[1])] = trimName(match[2]);
	for (const match of output[1].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.audio[Number(match[1])] = trimName(match[2]);
};

/**
 * @type {{[name: string]: {spawn: (logger: import("@wixonic/logger").Logger) => childProcess.ChildProcess, process: childProcess.ChildProcess?, active: boolean, name: string}}}
 */
const captureProcess = {
	microphone: {
		active: false,
		name: "Microphone capture",
		spawn: (logger) => {
			logger.info("Starting process:", captureProcess.microphone.name);
			return childProcess.spawn("ffmpeg", [
				"-hide_banner",
				"-loglevel", "info",
				"-f", "avfoundation",
				"-framerate", "60",
				"-i", `:${deviceList.audio.indexOf("Wave Link MicrophoneFX")}`,

				"-filter_complex", "volume=0.5",
				"-c:a", "aac",
				"-b:a", "320k",
				"-ac", "2",
				"-ar", "48000",

				"-flags", "low_delay",
				"-fflags", "nobuffer",
				"-flush_packets", "1",
				"-muxdelay", "0",
				"-muxpreload", "0",
				"-f", "mpegts",
				`udp://192.168.1.43:2003`
			], { stdio: "inherit" });
		},
		process: null
	}
};

const update = () => {
	updateDeviceList();

	for (const cp of Object.values(captureProcess)) {
		if (!cp.process || cp.process.killed) {
			if (cp.active) {
				cp.process = cp.spawn(log);

				for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
					process.once(signal, async (reason, code) => {
						if (!cp.process.killed) {
							cp.process.removeAllListeners("exit");
							cp.process.kill(signal);
						}
					});
				}
			}
		} else if (!cp.process.killed && !cp.active) cp.process.kill("SIGTERM");
	}

	setTimeout(update, 1000);
};

update();

const info = {
	path: "/obs/settings/",
	handlers: {
		get: async (logger, settings, req, res) => {
			const { id } = req.query;
			const processId = id;

			if (!processId || !captureProcess[processId]) return res.status(400).send("Invalid or missing process ID");

			res.json({ id: processId, active: captureProcess[processId].active });
		},
		post: (logger, settings, req, res) => {
			let body = "";
			req.on("data", (chunk) => body += chunk.toString());

			req.on("end", async () => {
				try {
					const response = JSON.parse(body);
					const { id } = req.query;
					const { status } = response;

					if (!id || !captureProcess[id]) return res.status(400).send("Invalid or missing process ID");
					captureProcess[id].active = status;

					res.json({ id, active: captureProcess[id].active });
				} catch {
					res.status(400).send("Invalid status value");
				}
			});
		}
	}
};

module.exports = info;