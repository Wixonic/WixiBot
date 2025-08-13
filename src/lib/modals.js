const fs = require("fs");
const path = require("path");

class ModalHandler {
	/**
	 * @type {import("../types.d.ts").ModalInfo[]}
	 */
	static modals = [];

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 */
	constructor(logger) {
		this.logger = {
			debug: (...any) => logger.debug("[Modals]", ...any),
			error: (...any) => logger.error("[Modals]", ...any),
			info: (...any) => logger.info("[Modals]", ...any),
			warn: (...any) => logger.warn("[Modals]", ...any)
		};
	};

	loadModals() {
		const modalsPath = path.join(__dirname, "..", "modals");
		const files = fs.readdirSync(modalsPath).filter((file) => file.endsWith(".js"));

		for (const file of files) {
			const modulePath = path.join(modalsPath, file);
			delete require.cache[require.resolve(modulePath)];
			const modal = require(modulePath);

			ModalHandler.modals.push(modal);
			this.logger.debug("Loaded modal:", modal.name);
		}
	}
};

module.exports = ModalHandler;