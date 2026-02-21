const fs = require("fs");
const path = require("path");
const { getStorage } = require("../lib/storage.js");

const html = fs.readFileSync(path.join(__dirname, "../lib/storage.html"), "utf-8");

/**
 * @type {import("../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/:code/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk, next) => {
			if (req.hostname !== new URL(settings.website.storage).hostname) return next ? next() : res.status(404).end();

			const code = req.params.code;
			const api = getStorage(settings);
			const db = api.read();

			const entry = db[code];
			if (!entry) {
				const renderedHtml = html
					.replace("{{DESCRIPTION}}", "Link expired or not found.")
					.replace("{{CONTENT}}", "<p class='error'>This ephemeral storage does not exist or the 1-hour time limit has expired.</p>");
				return res.status(404).send(renderedHtml);
			}

			const timeLeft = Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000 / 60));

			if (!entry.uploaded) {
				const renderedHtml = html
					.replace("{{DESCRIPTION}}", "Waiting for file upload (Expires in " + timeLeft + "m)")
					.replace("{{CONTENT}}", `<div style="margin-bottom: 1rem;">

	<label class="file-label">

		<span>Click to select a file</span>
		<input type="file" id="fileInput" style="display: none;" onchange="document.getElementById('fileName').innerText = this.files[0] ? this.files[0].name : '';" />

	</label>

	<div id="fileName" class="file-name"></div>
	<div id="progress" class="progress-bg">
		<div id="progressBar" class="progress-bar"></div>
	</div>

	<button id="uploadBtn" onclick="uploadFile()" class="btn">Start Upload</button>

	<p class="note">You have a single-use upload token. Any file size is accepted (subject to server limitations).</p>
</div>`);
				return res.status(200).send(renderedHtml);
			} else {
				if (req.query.download === "true") {
					const filePath = path.join(api.storagePath, code);
					if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File lost" });
					return res.download(filePath, entry.filename);
				}

				const renderedHtml = html
					.replace("{{DESCRIPTION}}", "The file has been successfully uploaded and is ready to be downloaded.")
					.replace("{{CONTENT}}", `<div>

	<div class="box">

		${entry.filename}

	</div>

<a href="?download=true" class="btn btn-green">Download File</a>
<p class="note">This link will self-destruct in approximately ${timeLeft} minutes.</p>

</div>`);
				return res.status(200).send(renderedHtml);
			}
		},
		post: async (logger, settings, req, res, bot, rpc, sdk, next) => {
			if (req.hostname !== new URL(settings.website.storage).hostname) return next ? next() : res.status(404).end();

			const code = req.params.code;
			const api = getStorage(settings);
			const db = api.read();

			const entry = db[code];
			if (!entry) return res.status(404).send("Link expired or not found.");
			if (entry.uploaded) return res.status(403).send("A file has already been uploaded on this unique link.");

			const filename = req.headers["x-filename"] ? decodeURIComponent(req.headers["x-filename"]) : "upload.bin";
			const filePath = path.join(api.storagePath, code);

			const writeStream = fs.createWriteStream(filePath);

			req.pipe(writeStream);

			req.on("end", () => {
				entry.uploaded = true;
				entry.filename = filename;

				const freshDb = api.read();
				if (freshDb[code]) {
					freshDb[code] = entry;
					api.write(freshDb);
				}

				res.status(200).send("OK");
			});

			req.on("error", (e) => {
				logger.error(`Storage ${code} upload error`, e);
				res.status(500).send("Upload Error");
				writeStream.close();
				if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
			});
		}
	},
	loop: {
		delay: 60 * 1000,
		process: async (logger, settings, bot) => {
			const api = getStorage(settings);
			const db = api.read();
			let changed = false;

			const now = Date.now();
			for (const id in db) {
				if (db[id].expiresAt < now) {
					logger.info(`Ephemeral storage expired: ${id}`);

					const filePath = path.join(api.storagePath, id);
					if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

					delete db[id];
					changed = true;
				}
			}

			if (changed) api.write(db);
			return true;
		}
	}
};

module.exports = info;