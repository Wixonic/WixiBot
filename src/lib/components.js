const { ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");

class ComponentHandler {
	/**
	 * @type {import("../types.d.ts").ComponentInfo[]}
	 */
	static buttons = [];

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 */
	constructor(logger) {
		this.logger = {
			debug: (...any) => logger.debug("[Components]", ...any),
			error: (...any) => logger.error("[Components]", ...any),
			info: (...any) => logger.info("[Components]", ...any),
			warn: (...any) => logger.warn("[Components]", ...any)
		};
	};

	loadComponents() {
		const Performance = require("./performance.js");
		if (!Performance.logger) Performance.init(this.logger);

		return Performance.measure("Module", "Components", () => {
			const componentsPath = path.join(__dirname, "..", "components");
			const files = fs.readdirSync(componentsPath).filter((file) => file.endsWith(".js"));

			for (const file of files) {
				const modulePath = path.join(componentsPath, file);
				delete require.cache[require.resolve(modulePath)];
				const component = require(modulePath);

				if (component.type) {
					switch (component.type) {
						case ComponentType.Button:
							ComponentHandler.buttons.push(component);
							this.logger.debug("Loaded button component:", component.name);
							break;

						default:
							this.logger.warn("Unknown type in file:", file);
							break;
					}
				} else this.logger.warn("Invalid component:", component.name);
			}
		});
	}
};

module.exports = ComponentHandler;