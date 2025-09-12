import loader from "/lib/loader.js";
import { init } from "/lib/main.js";
import { path } from "/lib/path.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const main = document.querySelector("main");

	const params = new URLSearchParams(location.search);
	const category = params.get("category") ?? "percent";

	const nav = document.createElement("nav");
	nav.classList.add("fade");

	{
		const bank = document.createElement("button");
		bank.classList.add("button");
		bank.disabled = category == "bank";
		bank.innerHTML = "Banque";
		bank.addEventListener("click", async () => {
			if (!bank.disabled) {
				bank.disabled = true;
				location.href = "/kcmaths/?category=bank";
			}
		});
		nav.append(bank);

		const entries = document.createElement("button");
		entries.classList.add("button");
		entries.disabled = category == "entries";
		entries.innerHTML = "Participations";
		entries.addEventListener("click", async () => {
			if (!entries.disabled) {
				entries.disabled = true;
				location.href = "/kcmaths/?category=entries";
			}
		});
		nav.append(entries);

		const percent = document.createElement("button");
		percent.classList.add("button");
		percent.disabled = category == "percent";
		percent.innerHTML = "Pourcentage";
		percent.addEventListener("click", async () => {
			if (!percent.disabled) {
				percent.disabled = true;
				location.href = "/kcmaths/?category=percent";
			}
		});
		nav.append(percent);

		const victories = document.createElement("button");
		victories.classList.add("button");
		victories.disabled = category == "victories";
		victories.innerHTML = "Victoires";
		victories.addEventListener("click", async () => {
			if (!victories.disabled) {
				victories.disabled = true;
				location.href = "/kcmaths/?category=victories";
			}
		});
		nav.append(victories);
	}

	main.append(nav);

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
		percent.innerHTML = `${Math.floor(data.percent * 100)}%`;
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

	const getIdFromDate = (date) => String(date.getDate()).padStart(2, "0") + String(date.getMonth() + 1).padStart(2, "0");

	let date = new Date();
	let leaderboardRequest = await request("GET", new URL(`/kcmaths/api/?date=${getIdFromDate(date)}`, localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

	while (leaderboardRequest.status == 404) {
		date.setUTCDate(date.getUTCDate() - 1);
		leaderboardRequest = await request("GET", new URL(`/kcmaths/api/?date=${getIdFromDate(date)}`, localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);
		if (Date.now() - date.getTime() > 28 * 24 * 60 * 60 * 1000) break;
	}

	if (leaderboardRequest.status == 200) {
		const leaderboard = leaderboardRequest.response;
		for (const id in leaderboard) {
			leaderboard[id].percent = leaderboard[id].entries > 0 ? leaderboard[id].victories / leaderboard[id].entries : 0;
			leaderboard[id].id = id;
		}

		const sortedLeaderboard = Object.values(leaderboard).sort((a, b) => {
			switch (category) {
				case "bank":
					if (a.kcCoins == b.kcCoins) return b.percent - a.percent;
					else return b.kcCoins - a.kcCoins;

				case "entries":
					if (a.entries == b.entries) return b.percent - a.percent;
					else return b.entries - a.entries;

				case "percent":
					if (a.percent == b.percent) return b.entries - a.entries;
					else return b.percent - a.percent;

				case "victories":
					if (a.victories == b.victories) return b.percent - a.percent;
					else return b.victories - a.victories;

				default:
					return 0;
			};
		});

		await (async () => {
			const section = document.createElement("section");
			section.classList.add("fade");
			main.append(section);

			const title = document.createElement("h2");
			title.classList.add("fade", "slide");
			title.innerHTML = "KCMaths";
			section.append(title);

			const lastUpdated = document.createElement("p");
			lastUpdated.classList.add("fade", "slide");
			lastUpdated.innerHTML = `Mis à jour le: ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
			section.append(lastUpdated);

			const leaderboardContainer = document.createElement("div");
			leaderboardContainer.classList.add("leaderboard", "fade", "slide");

			let count = 0;
			for (const data of sortedLeaderboard) {
				const member = createMemberEntry(count++, data);
				leaderboardContainer.append(member);
			}

			section.append(leaderboardContainer);
		})();
	} else main.innerHTML += "Failed to fetch recent data";
});