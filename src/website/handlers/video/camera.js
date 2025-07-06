const { spawn, spawnSync } = require("child_process");

let deviceList = [];
let captureProcess = null;

const trimName = (name) => name.split("(")[0].replace(/\s\n\t/, " ").trim();

const updateDeviceList = () => {
	const result = spawnSync("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-f", "avfoundation",
		"-list_devices", "true",
		"-i", ""
	], { encoding: "utf8", stderr: "pipe" });

	deviceList = [];
	const output = result.stderr || result.stdout;

	for (const match of output.split("AVFoundation audio devices")[0].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList[Number(match[1])] = trimName(match[2]);
};

const capture = (index) => {
	captureProcess = spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-hide_banner",
		"-loglevel", "warning",
		"-f", "mpegts",
		"-framerate", "30",
		"-video_size", "1920x1080",
		"-pix_fmt", "uyvy422",
		"-i", "upd://@:2002",

		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-g", "1",
		"-keyint_min", "1",
		"-sc_threshold", "0",
		"-c:v", "libx264",
		"-profile:v", "baseline",
		"-level", "3.0",
		"-pix_fmt", "yuv420p",

		"-flags", "low_delay",
		"-fflags", "nobuffer",
		"-flush_packets", "1",
		"-muxdelay", "0",
		"-muxpreload", "0",
		"-f", "mp4",
		"-movflags", "frag_keyframe+empty_moov+default_base_moof",
		"pipe:1"
	]);
};

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/video/camera/",
	handlers: {
		ws: async (logger, settings, ws) => {
			const cleanup = () => {
				if (captureProcess) {
					captureProcess.kill("SIGKILL");
					captureProcess = null;
					logger.debug("Capture process killed");
				}
			};

			ws.once("message", (nameData) => {
				updateDeviceList();

				const name = trimName(nameData.toString());

				let index = 0;
				for (const id in deviceList) {
					if (deviceList[id] == name) {
						index = id;
						break;
					}
				}

				cleanup();
				logger.info("Starting with input:", deviceList[index] ?? "unknown");
				capture(`${index}:`);
				captureProcess.stdout.on("data", (frame) => ws.send(frame));
				captureProcess.stderr.on("data", (e) => logger.warn(`ffmpeg: ${String(e).trim()}`));
				captureProcess.on("error", (e) => logger.error(`ffmpeg error: ${e.message}`));
				captureProcess.on("exit", () => cleanup());
			});

			ws.on("error", (e) => {
				logger.warn(`WebSocket error: ${e.message}`);
				cleanup();
			});

			ws.on("close", () => {
				logger.debug("WebSocket closed");
				cleanup();
			});
		}
	}
};

module.exports = info;