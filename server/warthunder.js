const sharp = require("sharp");

const request = require("../lib/request.js");
const { wait } = require("../utils.js");

const config = require("../config.js");

const get = async () => {
	const errors = [];
	let info = {};
	let map = Buffer.from("");
	let objs = {};
	let vehicle = "unknown vehicle";

	try {
		info = await request({
			url: new URL(config.warthunder.paths.map.info, `http://localhost:${config.warthunder.port}`),
			type: "json",
			secure: false
		});

		await wait(config.warthunder.waitingTime);

		objs = await request({
			url: new URL(config.warthunder.paths.map.objects, `http://localhost:${config.warthunder.port}`),
			type: "json",
			secure: false
		});

		await wait(config.warthunder.waitingTime);

		const imageResponse = await request({
			url: new URL(config.warthunder.paths.map.image, `http://localhost:${config.warthunder.port}`),
			type: "raw",
			secure: false
		});

		if (info.error) errors.push(`Map Info: ${info.error}`);
		if (objs.error) errors.push(`Map Objects: ${objs.error}`);
		if (imageResponse.error) errors.push(`Map: ${imageResponse.error}`);

		if (errors.length == 0) {
			const width = 512;
			const height = 512;

			let mapImage = sharp(Buffer.concat(imageResponse)).resize({
				width,
				height,
				fit: "contain"
			});

			const svgPoints = [];
			for (const obj of objs) {
				if (["ground_model", "aircraft"].includes(obj.type)) {
					svgPoints.push(`<circle cx="${obj.x * width}" cy="${obj.y * height}" r="${Math.max(width, height) / 50}" fill="${obj.color}" stroke="#FFF" stroke-width="${Math.max(width, height) / 500}" />`);
				}

				if (["capture_zone"].includes(obj.type)) {
					svgPoints.push(`<circle cx="${obj.x * width}" cy="${obj.y * height}" r="${Math.max(width, height) / 20}" fill="${obj.color}" stroke="#FFF" stroke-width="${Math.max(width, height) / 250}" />`);
				}
			}

			mapImage = mapImage.composite([{
				input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgPoints.join("")}</svg>`),
				top: 0,
				left: 0
			}]).toFormat("png");

			map = await mapImage.toBuffer();
		}
	} catch (e) {
		errors.push(`Image: ${e}`);
	}

	await wait(config.warthunder.waitingTime);

	if (errors.length == 0) {
		try {
			const indicators = await request({
				url: new URL(config.warthunder.paths.vehicle.indicators, `http://localhost:${config.warthunder.port}`),
				type: "json",
				secure: false
			});

			switch (indicators?.army) {
				case "tank":
					vehicle = `Tank ${indicators.type.split("/")[1].slice(3).split("_").join(" ").toUpperCase()} (${indicators.crew_current}/${indicators.crew_total} crew members remaining)`;
					break;

				case "air":
					await wait(config.warthunder.waitingTime);

					try {
						const state = await request({
							url: new URL(config.warthunder.paths.vehicle.state, `http://localhost:${config.warthunder.port}`),
							type: "json",
							secure: false
						});

						const name = indicators.type.split("_");
						name.pop();

						if (name.join(" ") == "DUMMY") errors.push("Not spawned");
						else {
							const altitude = Math.ceil(state["H, m"] / 100) * 100;
							const speed = Math.ceil(state["TAS, km/h"] / 50) * 50;

							vehicle = `Plane ${name.join(" ").toUpperCase()} (${speed} km/h - ${altitude} m)`;
						}
					} catch (e) {
						errors.push(`State: ${e}`);
					}
					break;

				default:
					vehicle = "Naval vehicle"
					break;
			};
		} catch (e) {
			errors.push(`Indicators: ${e}`);
		}
	}

	return {
		errors,
		info,
		map,
		objs,
		valid: errors.length == 0,
		vehicle
	};
};

module.exports = get;