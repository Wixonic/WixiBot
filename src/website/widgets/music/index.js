import request from "./request.js";

let currentActivities = {};
let currentActivityIntervals = [];
const activityChanged = (type, activity) => {
	const previousActivity = currentActivities[type];
	let changed = false;

	changed ||= activity.applicationId != previousActivity?.applicationId;
	changed ||= activity.assets?.small_image != previousActivity?.assets?.small_image;
	changed ||= activity.assets?.small_text != previousActivity?.assets?.small_text;
	changed ||= activity.assets?.large_image != previousActivity?.assets?.large_image;
	changed ||= activity.assets?.large_text != previousActivity?.assets?.large_text;
	changed ||= Math.floor((activity.timestamps?.start ?? 0) / 10000) != Math.floor((previousActivity?.timestamps?.start ?? 0) / 10000);
	changed ||= Math.floor((activity.timestamps?.end ?? 0) / 10000) != Math.floor((previousActivity?.timestamps?.end ?? 0) / 10000);
	changed ||= activity.name != previousActivity?.name;
	changed ||= activity.details != previousActivity?.details;
	changed ||= activity.state != previousActivity?.state;
	changed ||= activity.type != previousActivity?.type;

	return changed;
};

const compileAsset = (url) => {
	switch (true) {
		case url == "spotify:null":
			url = null;
			break;

		case url.startsWith("spotify:"):
			url = url.replace("spotify:", "https://i.scdn.co/image/");
			break;
	}

	return url;
};

const compileDuration = (duration) => {
	const hours = Math.floor(duration / 60 / 60 / 1000);
	const minutes = Math.floor(duration / 60 / 1000) % 60;
	const seconds = Math.floor(duration / 1000) % 60;

	return `${hours > 0 ? hours + ":" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

addEventListener("DOMContentLoaded", async () => {
	const activityContainer = document.createElement("container");
	document.body.append(activityContainer);

	const cycle = async () => {
		try {
			const req = await request("GET", new URL("/activity/", "https://server.wixonic.fr"), null, null, null, -1, false);

			const activities = JSON.parse(req.response);

			let changed = false;
			for (const type in activities) changed ||= activityChanged(type, activities[type]);
			for (const type in currentActivities) changed ||= !activities[type];

			if (changed) {
				for (const interval of currentActivityIntervals ?? []) clearInterval(interval);
				currentActivityIntervals = [];
				currentActivities = activities;

				const els = [];
				for (const type in activities) {
					const activity = activities[type];
					console.log(activity);

					const el = document.createElement("activity");
					el.classList.add("fade", "slide");

					switch (type) {
						case "music":
							{
								let current = Date.now() - (activity.timestamps?.start ?? 0);
								const duration = (activity.timestamps?.end ?? 0) - (activity.timestamps?.start ?? 0);
								if (current > duration) current = duration;

								const thumbnail = document.createElement("img");
								thumbnail.classList.add("thumbnail");
								thumbnail.src = compileAsset(activity.assets?.large_image) ?? compileAsset(activity.assets?.small_image);
								el.append(thumbnail);

								const title = document.createElement("div");
								title.classList.add("title");
								title.innerText = activity.name;
								el.append(title);

								const artists = document.createElement("div");
								artists.classList.add("artists");
								artists.innerText = activity.state;
								el.append(artists);

								const album = document.createElement("div");
								album.classList.add("album");
								album.innerText = activity.assets?.large_text ?? "";
								el.append(album);

								const start = document.createElement("div");
								start.classList.add("start");
								start.innerText = compileDuration(current);
								el.append(start);

								const end = document.createElement("div");
								end.classList.add("end");
								end.innerText = compileDuration(duration);
								el.append(end);

								const bar = document.createElement("div");
								bar.classList.add("bar");

								const innerBar = document.createElement("div");
								innerBar.classList.add("innerBar");
								innerBar.style.width = `${duration == 0 ? 50 : current / duration * 100}%`;
								bar.append(innerBar);

								el.append(bar);

								els.push(el);
								currentActivityIntervals.push(setInterval(() => {
									current = Date.now() - (activity.timestamps?.start ?? 0);
									if (current > duration) current = duration;
									start.innerText = compileDuration(current);
									innerBar.style.width = `${duration == 0 ? 50 : current / duration * 100}%`;
								}, 1000));
							}
							break;
					}
				}

				if (els.length < 1) throw "Empty";

				activityContainer.innerHTML = "";
				activityContainer.append(...els);
				if (!document.body.contains(activityContainer)) document.body.append(activityContainer);
			}
		} catch (e) {
			console.log("Activity not available:", e);
			if (document.body.contains(activityContainer)) document.body.removeChild(activityContainer);
		}

		setTimeout(cycle, 5000);
	};

	cycle();
});