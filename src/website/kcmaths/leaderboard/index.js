import { init } from "/lib/main.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const main = document.querySelector("main");

	const params = new URLSearchParams(location.search);
	let category = params.get("category") ?? "percent";
	let date = params.get("date") ? new Date(params.get("date")) : new Date();
	let mode = "before";
	const history = [];

	const load = async (checkNearest = true) => {
		main.innerHTML = "";

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

		const sameDay = (a, b) => a.getUTCDate() == b.getUTCDate() && a.getUTCMonth() == b.getUTCMonth() && a.getUTCFullYear() == b.getUTCFullYear();

		const displayDateControls = (entryDate, failed) => {
			const dateControls = document.createElement("nav");
			dateControls.classList.add("fade", "slide");

			const before = document.createElement("button");
			before.classList.add("button");
			before.disabled = failed && checkNearest;
			before.innerHTML = "Précédent";
			before.addEventListener("click", async () => {
				if (!before.disabled) {
					before.disabled = true;
					mode = "before";
					date.setUTCDate(date.getUTCDate() - 1);
					load();
				}
			});
			dateControls.append(before);

			const min = new Date(entryDate.getTime());
			min.setUTCDate(min.getUTCDate() - 28);
			const max = new Date();

			const entryDateField = document.createElement("input");
			entryDateField.type = "date";
			entryDateField.id = "entryDate";
			entryDateField.min = `${min.getUTCFullYear()}-${String(min.getUTCMonth() + 1).padStart(2, "0")}-${String(min.getUTCDate()).padStart(2, "0")}`;
			entryDateField.value = `${entryDate.getUTCFullYear()}-${String(entryDate.getUTCMonth() + 1).padStart(2, "0")}-${String(entryDate.getUTCDate()).padStart(2, "0")}`;
			entryDateField.max = `${max.getUTCFullYear()}-${String(max.getUTCMonth() + 1).padStart(2, "0")}-${String(max.getUTCDate()).padStart(2, "0")}`;
			entryDateField.addEventListener("input", () => {
				date = entryDateField.valueAsDate;
				load(false);
			});
			dateControls.append(entryDateField);

			const after = document.createElement("button");
			after.classList.add("button");
			after.disabled = sameDay(new Date(), date);
			after.innerHTML = "Suivant";
			after.addEventListener("click", async () => {
				if (!after.disabled) {
					after.disabled = true;
					mode = "after";
					date.setUTCDate(date.getUTCDate() + 1);
					load();
				}
			});
			dateControls.append(after);

			return dateControls;
		};

		const createMemberEntry = (id, data) => {
			const member = document.createElement("a");
			member.classList.add("member");
			member.href = `/kcmaths/user?id=${data.id}`;

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
			percent.innerHTML = data.entries > 0 && data.victories > 0 ? Math.floor((data.victories / data.entries) * 100) + "%" : "--";
			member.append(percent);

			const victories = document.createElement("div");
			victories.classList.add("victories");
			victories.innerHTML = data.victories > 0 ? data.victories : "--";
			member.append(victories);

			const entries = document.createElement("div");
			entries.classList.add("entries");
			entries.innerHTML = data.entries > 0 ? data.entries : "--";
			member.append(entries);

			const coins = document.createElement("div");
			coins.classList.add("coins");
			coins.innerHTML = data.kcCoins;
			member.append(coins);

			return member;
		};

		const getIdFromDate = (date) => String(date.getUTCDate()).padStart(2, "0") + String(date.getUTCMonth() + 1).padStart(2, "0") + date.getUTCFullYear();

		const displayLeaderboard = async (entry) => {
			const entryDate = new Date(entry.date);
			const sortedLeaderboard = Object.values(entry.leaderboard).sort((a, b) => {
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

			{
				const section = document.createElement("section");
				section.classList.add("fade");
				main.append(section);

				const title = document.createElement("h2");
				title.classList.add("fade", "slide");
				title.innerHTML = "Classement";
				section.append(title);

				const sortingFilters = document.createElement("nav");
				sortingFilters.classList.add("fade", "slide");

				{
					const percent = document.createElement("button");
					percent.classList.add("button");
					percent.disabled = category == "percent";
					percent.innerHTML = "Pourcentage";
					percent.addEventListener("click", async () => {
						if (!percent.disabled) {
							percent.disabled = true;
							category = "percent";
							load();
						}
					});
					sortingFilters.append(percent);

					const bank = document.createElement("button");
					bank.classList.add("button");
					bank.disabled = category == "bank";
					bank.innerHTML = "Banque";
					bank.addEventListener("click", async () => {
						if (!bank.disabled) {
							bank.disabled = true;
							category = "bank";
							load();
						}
					});
					sortingFilters.append(bank);

					const entries = document.createElement("button");
					entries.classList.add("button");
					entries.disabled = category == "entries";
					entries.innerHTML = "Participations";
					entries.addEventListener("click", async () => {
						if (!entries.disabled) {
							entries.disabled = true;
							category = "entries";
							load();
						}
					});
					sortingFilters.append(entries);

					const victories = document.createElement("button");
					victories.classList.add("button");
					victories.disabled = category == "victories";
					victories.innerHTML = "Victoires";
					victories.addEventListener("click", async () => {
						if (!victories.disabled) {
							victories.disabled = true;
							category = "victories";
							load();
						}
					});
					sortingFilters.append(victories);
				}

				section.append(sortingFilters);

				section.append(displayDateControls(entryDate));

				const leaderboardContainer = document.createElement("div");
				leaderboardContainer.classList.add("leaderboard", "fade", "slide");

				const header = document.createElement("div");
				header.classList.add("header");
				{
					const rank = document.createElement("div");
					rank.classList.add("rank");
					header.append(rank);

					const name = document.createElement("div");
					name.classList.add("name");
					name.innerHTML = "Nom";
					header.append(name);

					const percent = document.createElement("div");
					percent.classList.add("percent");
					percent.innerHTML = "Ratio";
					header.append(percent);

					const coins = document.createElement("div");
					coins.classList.add("coins");
					coins.innerHTML = "KCCoins";
					header.append(coins);

					const entries = document.createElement("div");
					entries.classList.add("entries");
					entries.innerHTML = "Particip.";
					header.append(entries);

					const victories = document.createElement("div");
					victories.classList.add("victories");
					victories.innerHTML = "Victoir.";
					header.append(victories);
				}
				leaderboardContainer.append(header);

				let count = 0;
				for (const data of sortedLeaderboard) {
					const member = createMemberEntry(count++, data);
					leaderboardContainer.append(member);
				}

				section.append(leaderboardContainer);
			};
		};

		const saved = history.find((entry) => sameDay(new Date(entry.date), date));

		if (saved) displayLeaderboard(saved);
		else {
			const initialDate = date.getTime();

			let leaderboardRequest = await request("GET", `/kcmaths/api/day?date=${getIdFromDate(date)}`, "json", "application/json", null, 600);

			if (checkNearest) {
				while (leaderboardRequest.status == 404) {
					date.setUTCDate(date.getUTCDate() + (mode == "after" ? 1 : -1));

					if (date.getTime() > Date.now()) {
						date = new Date();
						mode = "before";
					}

					if (initialDate - date.getTime() > 28 * 24 * 60 * 60 * 1000) break;

					leaderboardRequest = await request("GET", `/kcmaths/api/day?date=${getIdFromDate(date)}`, "json", "application/json", null, 600);
				}
			}

			if (leaderboardRequest.status == 200) {
				const leaderboard = leaderboardRequest.response;
				for (const id in leaderboard) {
					leaderboard[id].percent = leaderboard[id].entries > 0 ? leaderboard[id].victories / leaderboard[id].entries : 0;
					leaderboard[id].id = id;
				}

				const entry = {
					date: date.getTime(),
					leaderboard
				};

				history.push(entry);
				displayLeaderboard(entry);
			} else {
				const section = document.createElement("section");
				section.classList.add("fade");
				main.append(section);

				const title = document.createElement("h2");
				title.classList.add("fade", "slide");
				title.innerHTML = "KCMaths";
				section.append(title);

				section.append(displayDateControls(date, true));

				const message = document.createElement("div");
				message.innerHTML = "Failed to fetch data for this period.";
				section.append(message);
			};
		};
	};

	await load();
});