const { spawn } = require("child_process");

let captureProcess = null;

const capture = () => {
	captureProcess = spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-hide_banner",
		"-loglevel", "verbose",

		"-flags", "low_delay",
		"-fflags", "+genpts+discardcorrupt",
		"-avioflags", "direct",
		"-probesize", "32",
		"-analyzeduration", "0",

		"-f", "mpegts",
		"-i", "udp://@:2002",

		"-c:v", "mpeg2video",
		"-pixel_format", "uyvy422",
		"-video_size", "1920x1080",
		"-framerate", "30",

		"-vsync", "0",
		"-max_error_rate", "1.0",
		"-err_detect", "ignore_err",

		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-tune", "zerolatency",
		"-pix_fmt", "yuv420p",

		"-f", "mp4",
		"-movflags", "frag_keyframe+empty_moov+default_base_moof+faststart",
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

			cleanup();
			logger.info("Starting stream");
			capture();
			captureProcess.stdout.on("data", (frame) => ws.send(frame));
			captureProcess.stderr.on("data", (e) => logger.warn(`ffmpeg: ${String(e).trim()}`));
			captureProcess.on("error", (e) => logger.error(`ffmpeg error: ${e.message}`));
			captureProcess.on("exit", () => cleanup());

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