import { init } from "/lib/main.js";
import request from "/lib/request.js";

const formatRank = (rank) => {
	if (rank <= 0) return "--";
	else if (rank == 1) return "1er";
	else return rank + "e";
};

addEventListener("DOMContentLoaded", async () => {
	await init();

	const main = document.querySelector("main");

	const params = new URLSearchParams(location.search);
	const id = params.get("id");

	if (!id) location.href = "/kcmaths/";

	const nav = document.createElement("nav");
	nav.classList.add("fade");

	{
		const overview = document.createElement("button");
		overview.classList.add("button");
		overview.disabled = location.pathname == "/kcmaths/";
		overview.innerHTML = "Vue d'ensemble";
		overview.addEventListener("click", async () => {
			if (!overview.disabled) {
				overview.disabled = true;
				location.href = "/kcmaths/";
			}
		});
		nav.append(overview);

		const leaderboard = document.createElement("button");
		leaderboard.classList.add("button");
		leaderboard.disabled = location.pathname == "/kcmaths/leaderboard/";
		leaderboard.innerHTML = "Classement";
		leaderboard.addEventListener("click", async () => {
			if (!leaderboard.disabled) {
				leaderboard.disabled = true;
				location.href = "/kcmaths/leaderboard/";
			}
		});
		nav.append(leaderboard);
	}

	main.append(nav);

	{
		const userRequest = await request("GET", `/kcmaths/api/user?id=${encodeURIComponent(id)}`, "json", "application/json", null, 600);
		const userData = userRequest.response;

		const entries = [];

		for (const data of userData.entries) {
			const entry = data.value;

			if (entry) {
				entries.push({
					date: new Date(`${data.date.slice(4)}-${data.date.slice(2, 4)}-${data.date.slice(0, 2)}`),
					kcCoins: entry.kcCoins,
					entries: entry.entries,
					victories: entry.victories,
					rank: {
						bank: userData.leaderboard.bank.indexOf(id) + 1,
						entries: userData.leaderboard.entries.indexOf(id) + 1,
						percent: userData.leaderboard.percent.indexOf(id) + 1,
						victories: userData.leaderboard.victories.indexOf(id) + 1
					}
				});
			}
		}

		const user = {
			firstname: userData.entries.at(0)?.value?.firstName ?? id,
			lastname: userData.entries.at(0)?.value?.lastName,
			entries
		};

		const title = document.createElement("h2");
		title.classList.add("fade", "slide");
		title.innerHTML = user.firstname + (user.lastname ? ` ${user.lastname[0]}.` : "");
		main.append(title);

		const latest = user.entries.at(-1);

		const preview = document.createElement("section");
		preview.classList.add("fade", "slide", "preview");
		{
			const percent = document.createElement("button");
			percent.addEventListener("click", () => {
				if (!percent.disabled) {
					percent.disabled = true;
					location.href = "/kcmaths/leaderboard?category=percent";
				}
			});

			percent.classList.add("block", "button");
			percent.setAttribute("rank", latest.rank.percent);
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Rang";
				percent.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = formatRank(latest.rank.percent);
				percent.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = `${latest.entries > 0 ? Number(((latest.victories / latest.entries) * 100).toFixed(2)) + "%" : "--"} de victoires`;
				percent.append(value);
			}
			preview.append(percent);

			const bank = document.createElement("button");
			bank.addEventListener("click", () => {
				if (!bank.disabled) {
					bank.disabled = true;
					location.href = "/kcmaths/leaderboard?category=bank";
				}
			});

			bank.classList.add("block", "button");
			bank.setAttribute("rank", latest.rank.bank);
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Richesse";
				bank.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = formatRank(latest.rank.bank);
				bank.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = `${latest.kcCoins > 0 ? latest.kcCoins : "--"} KCCoin${latest.kcCoins > 1 ? "s" : ""}`;
				bank.append(value);
			}
			preview.append(bank);

			const victories = document.createElement("button");
			victories.addEventListener("click", () => {
				if (!victories.disabled) {
					victories.disabled = true;
					location.href = "/kcmaths/leaderboard?category=victories";
				}
			});

			victories.classList.add("block", "button");
			victories.setAttribute("rank", latest.rank.victories);
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Vainqueur";
				victories.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = formatRank(latest.rank.victories);
				victories.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = `${latest.victories > 0 ? latest.victories : "--"} victoire${latest.victories > 1 ? "s" : ""}`;
				victories.append(value);
			}
			preview.append(victories);

			const entries = document.createElement("button");
			entries.addEventListener("click", () => {
				if (!entries.disabled) {
					entries.disabled = true;
					location.href = "/kcmaths/leaderboard?category=entries";
				}
			});

			entries.classList.add("block", "button");
			entries.setAttribute("rank", latest.rank.entries);
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Participant";
				entries.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = formatRank(latest.rank.entries);
				entries.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = `${latest.entries > 0 ? latest.entries : "--"} participation${latest.entries > 1 ? "s" : ""}`;
				entries.append(value);
			}
			preview.append(entries);
		}
		main.append(preview);
	}
});