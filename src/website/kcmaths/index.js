import loader from "/lib/loader.js";
import { init } from "/lib/main.js";
import { path } from "/lib/path.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const main = document.querySelector("main");

	const createMemberEntry = (id, data) => {
		const member = document.createElement("a");
		member.classList.add("member");
		// member.href = `/kcmaths/user?id=${data.id}`;

		const rank = document.createElement("div");
		rank.classList.add("rank");
		rank.innerHTML = id + 1;
		member.append(rank);

		const name = document.createElement("div");
		name.classList.add("name");
		name.innerHTML = data.id;
		member.append(name);

		const percent = document.createElement("div");
		percent.classList.add("percent");
		percent.innerHTML = `${Math.floor(data.victories / data.entries * 100)}%`;
		member.append(percent);

		const victories = document.createElement("div");
		victories.classList.add("victories");
		victories.innerHTML = data.victories;
		member.append(victories);

		const entries = document.createElement("div");
		entries.classList.add("entries");
		entries.innerHTML = data.entries;
		member.append(entries);

		const coins = document.createElement("div");
		coins.classList.add("coins");
		coins.innerHTML = data.kcCoins;
		member.append(coins);

		return member;
	};

	const leaderboardRequest = await request("GET", new URL("/kcmaths/api/", localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

	if (leaderboardRequest.status == 200) {
		const leaderboard = leaderboardRequest.response;

		await (async () => {
			const section = document.createElement("section");
			section.classList.add("fade");
			main.append(section);

			const title = document.createElement("h2");
			title.classList.add("fade", "slide");
			title.innerHTML = "KCMaths";
			section.append(title);

			const leaderboardContainer = document.createElement("div");
			leaderboardContainer.classList.add("leaderboard", "fade", "slide");

			let count = 0;
			for (const id in leaderboard) {
				const data = leaderboard[id];
				data.id = id;
				const member = createMemberEntry(count++, data);
				leaderboardContainer.append(member);
			}

			section.append(leaderboardContainer);
		})();
	}
});