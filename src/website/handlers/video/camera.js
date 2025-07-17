const { spawn } = require("child_process");
const { Transform } = require("stream");

class H264NalSplitter extends Transform {
	constructor() {
		super();
		this.buffer = Buffer.alloc(0);
		this.START_CODE = Buffer.from([0x00, 0x00, 0x00, 0x01]);
		this.START_CODE_SHORT = Buffer.from([0x00, 0x00, 0x01]);
	};

	_transform(chunk, encoding, callback) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		let offset = 0;

		while (offset < this.buffer.length) {
			const nextLong = this.indexOfBytes(this.buffer, this.START_CODE, offset + 1);
			const nextShort = this.indexOfBytes(this.buffer, this.START_CODE_SHORT, offset + 1);

			const nextIndex = Math.min(nextLong >= 0 ? nextLong : Infinity, nextShort >= 0 ? nextShort : Infinity);

			if (nextIndex == Infinity) {
				this.buffer = this.buffer.subarray(offset);
				break;
			}

			const startCodeLength = nextIndex == nextLong ? 4 : nextIndex == nextShort ? 3 : 0;

			const nalUnit = this.buffer.subarray(offset, nextIndex);
			if (nalUnit.length > 0) this.push(nalUnit);

			offset = nextIndex + startCodeLength;
		}

		if (offset >= this.buffer.length) this.buffer = Buffer.alloc(0);

		callback();
	};

	_flush(callback) {
		if (this.buffer.length > 0) {
			this.push(this.buffer);
			this.buffer = Buffer.alloc(0);
		}

		callback();
	};

	indexOfBytes(buffer, pattern, start = 0) {
		for (let i = start; i <= buffer.length - pattern.length; i++) {
			let match = true;
			for (let j = 0; j < pattern.length; j++) {
				if (buffer[i + j] != pattern[j]) {
					match = false;
					break;
				}
			}

			if (match) return i;
		}

		return -1;
	};
};

let captureProcess = null;

const capture = () => {
	captureProcess = spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-hide_banner",
		"-loglevel", "warning",

		"-fflags", "nobuffer+genpts",
		"-flags", "low_delay",

		"-f", "mpegts",
		"-i", "udp://:2002",

		"-c:v", "copy",

		"-f", "h264",
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
			capture();
			const splitter = new H264NalSplitter();
			captureProcess.stdout.pipe(splitter);
			captureProcess.stderr.on("data", (data) => logger.warn("FFmpeg:", data));

			splitter.on("data", (nal) => {
				if (nal.length > 4) {
					const nalType = nal[4] & 0x1F;
					if (nalType == 7 || nalType == 8) ws.send(nal);
					else if (nalType == 5 || nalType == 1) ws.send(nal);
				}
			});
		}
	}
};

module.exports = info;