const fs = require("fs");
const path = require("path");
const pawnote = require("pawnote");

const log = require("../log.js");
const { titleCase } = require("../utils.js");

const config = require("../config.js");

/**
 * @typedef {Object} Class
 * @property {string} subject
 * @property {Date} startDate
 * @property {Date} endDate
 */

/**
 * @param {Date} date 
 * @returns Class | false
 */
const requestClassAt = async (date) => {
	const session = pawnote.createSessionHandle();

	try {
		if (!fs.existsSync(config.cache.pronote)) fs.mkdirSync(config.cache.pronote, { recursive: true });

		const storedInformation = JSON.parse(fs.readFileSync(path.join(config.cache.pronote, "refresh.json"), "utf-8"));
		storedInformation.deviceUUID = config.pronote.deviceId;

		const refreshInformation = await pawnote.loginToken(session, storedInformation);
		fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), JSON.stringify(refreshInformation), "utf-8");
	} catch (e) {
		log(`Failed to authenticate from refresh token: ${e}`);

		try {
			const refreshInformation = await pawnote.loginQrCode(session, {
				deviceUUID: config.pronote.deviceId,
				qr: JSON.parse(fs.readFileSync(path.join(config.cache.pronote, "qr.json"))),
				pin: config.pronote.pin
			});

			fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), JSON.stringify(refreshInformation), "utf-8");
		} catch (e) {
			log.error(`Failed to authenticate from QR Code: ${e}`);
			return false;
		}
	}

	try {
		const today = new Date(date.getTime());
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(date.getTime());
		tomorrow.setHours(23, 59, 59, 999);

		const todayTimetable = await pawnote.timetableFromIntervals(session, today, tomorrow);

		let currentClass;

		for (const el of todayTimetable.classes) {
			if (!(el.canceled || el.exempted) && el.startDate.getTime() <= date.getTime() && el.endDate.getTime() >= date.getTime()) {
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
		log.error(`Failed to fetch class: ${e}`);
		return false;
	}
};

module.exports = {
	requestClassAt
};