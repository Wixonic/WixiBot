import { init } from "/lib/main.js";
import request from "/lib/request.js";

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
			entries.push({
				date: new Date(`${data.date.slice(4)}-${data.date.slice(2, 4)}-${data.date.slice(0, 2)}`),
				kcCoins: entry.kcCoins,
				entries: entry.entries,
				victories: entry.victories,
				rank: {
					bank: userData.leaderboard.bank.indexOf(id),
					entries: userData.leaderboard.entries.indexOf(id),
					percent: userData.leaderboard.percent.indexOf(id),
					victories: userData.leaderboard.victories.indexOf(id)
				}
			});
		}

		const user = {
			firstname: userData.entries[0].value.firstName,
			lastname: userData.entries[0].value.lastName,
			entries
		};

		console.log(user);

		const title = document.createElement("h2");
		title.classList.add("fade", "slide");
		title.innerHTML = user.firstname;
		main.append(title);

		const latest = user.entries.at(-1);

		const preview = document.createElement("section");
		preview.classList.add("fade", "slide");
		{
			const bank = document.createElement("div");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Solde";
				bank.append(label);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.kcCoins ?? "--";
				bank.append(value);
			}
			preview.append(bank);

			const percentRank = document.createElement("div");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Rang";
				percentRank.append(label);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.rank.percent == -1 ? "--" : latest.rank.percent;
				percentRank.append(value);
			}
			preview.append(percentRank);

			const bankRank = document.createElement("div");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Richesse";
				bankRank.append(label);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.rank.bank == -1 ? "--" : latest.rank.bank;
				bankRank.append(value);
			}
			preview.append(bankRank);

			const victoriesRank = document.createElement("div");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Vainqueur";
				victoriesRank.append(label);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.rank.victories == -1 ? "--" : latest.rank.victories;
				victoriesRank.append(value);
			}
			preview.append(victoriesRank);

			const entriesRank = document.createElement("div");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Participants";
				entriesRank.append(label);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.rank.entries == -1 ? "--" : latest.rank.entries;
				entriesRank.append(value);
			}
			preview.append(entriesRank);
		}
		main.append(preview);
	}
});