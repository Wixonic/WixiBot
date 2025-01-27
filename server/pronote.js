const pawnote = require("pawnote");

const request = require("../lib/request.js");

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
		const storedInformation = await request({
			url: new URL("/pronote/refresh.json", config.server.url),
			type: "json",
			headers: {
				"Authorization": `WixKey ${config.wixkey}`
			},
			secure: !(process.env.DEV == "true")
		});

		if (!storedInformation.error) {
			const refreshInformation = await pawnote.loginToken(session, storedInformation);

			await request({
				url: new URL("/pronote/refresh.json", config.server.url),
				method: "POST",
				type: "json",
				headers: {
					"Authorization": `WixKey ${config.wixkey}`,
					"Content-Type": "application/json"
				},
				secure: !(process.env.DEV == "true"),
				body: JSON.stringify(refreshInformation)
			});
		} else throw storedInformation.error;
	} catch (e) {
		log(`Failed to authenticate from refresh token: ${e}`);

		try {
			const storedInformation = await request({
				url: new URL("/pronote/qr.json", config.server.url),
				type: "json",
				headers: {
					"Authorization": `WixKey ${config.wixkey}`
				},
				secure: !(process.env.DEV == "true")
			});

			if (!storedInformation.error) {
				const refreshInformation = await pawnote.loginQrCode(session, {
					deviceUUID: config.pronote.deviceId,
					qr: storedInformation,
					pin: config.pronote.pin
				});

				await request({
					url: new URL("/pronote/refresh.json", config.server.url),
					method: "POST",
					type: "json",
					headers: {
						"Authorization": `WixKey ${config.wixkey}`,
						"Content-Type": "application/json"
					},
					secure: !(process.env.DEV == "true"),
					body: JSON.stringify(refreshInformation)
				});
			} else throw storedInformation.error;
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