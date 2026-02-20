const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { createSMTPServer } = require("../../lib/onion/smtpServer.js");
const { relayEmail } = require("../../lib/onion/smtpClient.js");

const getMail = (settings) => {
	const mailPath = path.join(settings.secrets.paths.root, "mail");
	if (!fs.existsSync(mailPath)) fs.mkdirSync(mailPath, { recursive: true });

	const dbPath = path.join(mailPath, "db.json");
	if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

	const read = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
	const write = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, "\t"));

	return { dbPath, read, write };
};

let smtpConfigured = false;
let smtpServer = null;

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/mail/alias/",
	handlers: {
		post: async (logger, settings, req, res, bot, rpc, sdk, next) => {
			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) return res.status(401).json({ error: "Unauthorized" });

			const api = getMail(settings);
			const db = api.read();

			const id = crypto.randomBytes(4).toString("hex");

			db[id] = {
				id,
				createdAt: Date.now()
			};
			api.write(db);

			return res.status(200).end(`${id}@${new URL(settings.website.onion).hostname}`);
		}
	},
	loop: {
		delay: 5000,
		process: async (logger, settings) => {
			if (!smtpConfigured) {
				logger.info("Initializing embedded Onion SMTP Server...");
				smtpConfigured = true;

				const smtpHost = settings.secrets.smtp?.host;
				const smtpPort = settings.secrets.smtp?.port;
				const smtpAccount = settings.secrets.smtp?.user;
				const smtpPassword = settings.secrets.smtp?.password;

				if (!smtpAccount || !smtpPassword || !smtpHost || !smtpPort) {
					logger.error("SMTP credentials missing in secrets.js! Mail forwarding will fail until configured.");
				}

				const hostname = new URL(settings.website.onion).hostname;
				const escapedHostname = hostname.replace(/\./g, '\\.');
				const aliasRegex = new RegExp(`^([a-zA-Z0-9]+)@${escapedHostname}$`, 'i');
				smtpServer = createSMTPServer(logger, hostname, async (from, to, rawMessage) => {
					try {
						const aliasMatch = to.match(aliasRegex);
						if (!aliasMatch) {
							logger.warn(`Rejected unknown recipient format: ${to}`);
							return;
						}

						const code = aliasMatch[1];
						const api = getMail(settings);
						const db = api.read();

						if (!db[code]) {
							logger.warn(`Rejected invalid or unknown alias code: ${code}`);
							return;
						}

						if (smtpAccount && smtpPassword) {
							logger.info(`Valid Mail received for alias ${to} from ${from}. Relaying...`);
							await relayEmail(logger, smtpHost, smtpPort, smtpAccount, smtpPassword, rawMessage, from, settings.smtp.user, hostname);
							logger.info(`Successfully relayed message to ${settings.smtp.user}`);
						} else logger.error("Cannot relay email because SMTP secrets are not configured in settings.secrets.");
					} catch (e) {
						logger.error("Failed to relay email:", e);
					}
				});
			}

			return true;
		}
	}
};

module.exports = info;