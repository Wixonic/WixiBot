const fs = require("fs");
const path = require("path");
const pawnote = require("pawnote");

const log = require("../log.js");
const { titleCase } = require("../utils.js");

const config = require("../config.js");

let gotError = false;

const requestCurrentClass = async () => {
	if (!gotError) {
		const session = pawnote.createSessionHandle();

		try {
			if (!fs.existsSync(config.cache.pronote)) fs.mkdirSync(config.cache.pronote, { recursive: true });

			const storedInformation = JSON.parse(fs.readFileSync(path.join(config.cache.pronote, "refresh.json"), "utf-8"));
			log(storedInformation);

			const refreshInformation = await pawnote.loginToken(session, storedInformation);
			fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), JSON.stringify(refreshInformation), "utf-8");
		} catch (e) {
			log(`Failed to authenticate from refresh token: ${e}`);

			try {
				fs.rmSync(config.cache.pronote, { recursive: true });
				fs.mkdirSync(config.cache.pronote, { recursive: true });

				const refreshInformation = await pawnote.loginQrCode(session, {
					deviceUUID: config.pronote.deviceId,
					qr: config.pronote.qr,
					pin: config.pronote.pin
				});

				log(refreshInformation);

				fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), JSON.stringify(refreshInformation), "utf-8");
			} catch (e) {
				log(`Failed to authenticate from QR Code: ${e}`);
				gotError = true;
				return false;
			}
		}

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date();
			tomorrow.setHours(23, 59, 59, 999);

			const todayTimetable = await pawnote.timetableFromIntervals(session, today, tomorrow);

			let currentClass;

			for (const el of todayTimetable.classes) {
				if (!(el.canceled || el.exempted) && el.startDate.getTime() <= Date.now() && el.endDate.getTime() >= Date.now()) {
					currentClass = el;
				}
			}

			if (currentClass) {
				return {
					subject: titleCase(currentClass.subject.name),
					startDate: currentClass.startDate,
					endDate: currentClass.endDate
				};
			} else return false;
		} catch (e) {
			log(`Failed to fetch class: ${e}`);
			gotError = true;
			return false;
		}
	} else return false;
};

requestCurrentClass().then((response) => log(response));

module.exports = {
	requestCurrentClass
};