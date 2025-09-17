import { init } from "/lib/main.js";
import request from "/lib/request.js";

const formatRank = (rank) => {
	if (rank <= 0) return "--";
	else if (rank == 1) return "1er";
	else return rank + "e";
};

const graph = (data = [], xaxis = {}, yaxis = {}, layout = {}, config = {}) => {
	const graph = document.createElement("div");
	graph.classList.add("graph", "fade", "slide");
	Plotly.newPlot(graph, data, {
		autosize: false,
		width: Math.min(innerWidth / 2 - 50, 500),
		height: 300,
		dragmode: "pan",
		margin: { l: 50, r: 50, t: 20, b: 50 },
		showlegend: false,
		xaxis: {
			autorange: true,
			showgrid: false,
			rangeslider: {
				visible: false
			},
			tickformat: "%d/%m",
			title: { text: "Date" },
			type: "date",
			...xaxis
		},
		yaxis: {
			autorange: true,
			fixedrange: true,
			title: { text: "KCC" },
			type: "linear",
			...yaxis
		},
		...layout
	}, {
		displaylogo: false,
		locale: "fr",
		displayModeBar: false,
		responsive: true,
		scrollZoom: true,
		...config
	});

	graph.isUpdating = false;
	graph.update = async (date = []) => {
		if (!graph.isUpdating) {
			graph.isUpdating = true;

			try {
				const updateLayout = {};

				const startTime = new Date(graph._fullLayout.xaxis.range[0]).getTime();
				const endTime = new Date(graph._fullLayout.xaxis.range[1]).getTime();

				let yMin = Infinity;
				let yMax = -Infinity;

				for (let i = 0; i < date.length; i++) {
					const currentDate = date[i].getTime();
					if (currentDate >= startTime && currentDate <= endTime) {
						yMin = Math.min(yMin, open[i], close[i]);
						yMax = Math.max(yMax, open[i], close[i]);
					}
				}

				if (isFinite(yMin) && isFinite(yMax)) {
					const padding = (yMax - yMin) * 0.1;
					updateLayout["yaxis.range"] = [yMin - padding, yMax + padding];
				}

				await Plotly.relayout(graph, updateLayout);
			} catch (e) {
				console.warn("Failed to update graph:", e);
			}

			graph.isUpdating = false;
		}
	};

	graph.on("plotly_relayout", async (data) => {
		if (data["xaxis.range[0]"] || data["xaxis.range[1]"]) await graph.update();
	});

	return graph;
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
					percent: entry.entries > 0 ? entry.victories / entry.entries : 0,
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

		document.head.querySelector("title").innerHTML = document.head.querySelector("title").innerHTML.replace("User", user.firstname);

		const title = document.createElement("h2");
		title.classList.add("fade");
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
			percent.setAttribute("rank", latest.entries > 0 && latest.victories > 0 ? latest.rank.percent : "0");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Rang";
				percent.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = latest.entries > 0 && latest.victories > 0 ? formatRank(latest.rank.percent) : "--";
				percent.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.entries > 0 && latest.victories > 0 ? `${Number(((latest.victories / latest.entries) * 100).toFixed(2))}% de victoires` : "--";
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
				value.innerHTML = `${latest.kcCoins} KCC`;
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
			victories.setAttribute("rank", latest.victories > 0 ? latest.rank.victories : "0");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Vainqueur";
				victories.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = latest.victories > 0 ? formatRank(latest.rank.victories) : "--";
				victories.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.victories > 0 ? `${latest.victories} victoire${latest.victories > 1 ? "s" : ""}` : "--";
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
			entries.setAttribute("rank", latest.entries > 0 ? latest.rank.entries : "0");
			{
				const label = document.createElement("div");
				label.classList.add("label");
				label.innerHTML = "Participant";
				entries.append(label);

				const rank = document.createElement("div");
				rank.classList.add("rank");
				rank.innerHTML = latest.entries > 0 ? formatRank(latest.rank.entries) : "--";
				entries.append(rank);

				const value = document.createElement("div");
				value.classList.add("value");
				value.innerHTML = latest.entries > 0 ? `${latest.entries} participation${latest.entries > 1 ? "s" : ""}` : "--";
				entries.append(value);
			}
			preview.append(entries);
		}
		main.append(preview);

		const detailsTitle = document.createElement("h2");
		detailsTitle.classList.add("fade");
		detailsTitle.innerHTML = "Historique";
		detailsTitle.style.marginTop = "2rem";
		main.append(detailsTitle);

		const details = document.createElement("section");
		details.classList.add("details", "fade");
		{
			const bankHistory = document.createElement("div");
			{
				const title = document.createElement("h3");
				title.innerHTML = "Solde";
				bankHistory.append(title);

				const date = [];
				const open = [];
				const close = [];
				const high = [];
				const low = [];
				const text = [];

				for (const i in entries) {
					const entry = entries[i];
					date.push(entry.date);
					close.push(entry.kcCoins ?? 0);

					const previous = entries[i - 1];
					open.push(previous?.kcCoins ?? 0);

					high.push(Math.max(open[i], close[i]));
					low.push(Math.min(open[i], close[i]));

					const diff = (entry.kcCoins ?? 0) - (previous?.kcCoins ?? 0);
					text.push(`${entry.kcCoins ?? 0} KCC<br />${diff >= 0 ? "+" : "-"}${Math.abs(diff)} KCC`);
				}

				const bankGraph = graph([{
					x: date,
					open,
					close,
					high,
					low,

					hovertext: text,
					hoverinfo: "text",

					decreasing: { line: { color: "#F00" } },
					increasing: { line: { color: "#0C0" } },

					type: "candlestick"
				}]);

				await bankGraph.update(date);
				bankHistory.append(bankGraph);
			}
			details.append(bankHistory);

			const victoriesHistory = document.createElement("div");
			{
				const title = document.createElement("h3");
				title.innerHTML = "Victoires";
				victoriesHistory.append(title);

				const date = [];
				const open = [];
				const close = [];
				const text = [];

				for (const i in entries) {
					const entry = entries[i];
					date.push(entry.date);
					close.push(entry.victories ?? 0);

					const previous = entries[i - 1];
					open.push(previous?.victories ?? 0);

					const diff = (entry.victories ?? 0) - (previous?.victories ?? 0);
					text.push(`${entry.victories ?? 0} victoire${entry.victories != 1 ? "s" : ""}<br />+${diff} victoire${diff != 1 ? "s" : ""}`);
				}

				const victoriesGraph = graph([{
					x: date,
					open,
					low: open,
					high: close,
					close,

					hovertext: text,
					hoverinfo: "text",

					increasing: { line: { color: "#06F" } },

					type: "candlestick"
				}], {}, {
					title: { text: "Victoires" },
				});

				await victoriesGraph.update(date);
				victoriesHistory.append(victoriesGraph);
			}
			details.append(victoriesHistory);

			const entriesHistory = document.createElement("div");
			{
				const title = document.createElement("h3");
				title.innerHTML = "Participations";
				entriesHistory.append(title);

				const date = [];
				const open = [];
				const close = [];
				const text = [];

				for (const i in entries) {
					const entry = entries[i];
					date.push(entry.date);
					close.push(entry.entries ?? 0);

					const previous = entries[i - 1];
					open.push(previous?.entries ?? 0);

					const diff = (entry.entries ?? 0) - (previous?.entries ?? 0);
					text.push(`${entry.entries ?? 0} participation${entry.entries != 1 ? "s" : ""}<br />+${diff} participation${diff != 1 ? "s" : ""}`);
				}

				const entriesGraph = graph([{
					x: date,
					open,
					low: open,
					high: close,
					close,

					hovertext: text,
					hoverinfo: "text",

					increasing: { line: { color: "#06F" } },

					type: "candlestick"
				}], {}, {
					title: { text: "Participations" },
				});

				await entriesGraph.update(date);
				entriesHistory.append(entriesGraph);
			}
			details.append(entriesHistory);

			const percentHistory = document.createElement("div");
			{
				const title = document.createElement("h3");
				title.innerHTML = "Ratio";
				percentHistory.append(title);

				const date = [];
				const open = [];
				const close = [];
				const high = [];
				const low = [];
				const text = [];

				for (const i in entries) {
					const entry = entries[i];
					date.push(entry.date);
					close.push(entry.percent ?? 0);

					const previous = entries[i - 1];
					open.push(previous?.percent ?? 0);

					high.push(Math.max(open[i], close[i]));
					low.push(Math.min(open[i], close[i]));

					const diff = (entry.percent ?? 0) - (previous?.percent ?? 0);
					text.push(`${((entry.percent ?? 0) * 100).toFixed(2)}%<br />${diff >= 0 ? "+" : "-"}${Math.abs(diff * 100).toFixed(2)}%`);
				}

				const percentGraph = graph([{
					x: date,
					open,
					low,
					high,
					close,

					hovertext: text,
					hoverinfo: "text",

					decreasing: { line: { color: "#F00" } },
					increasing: { line: { color: "#0C0" } },

					type: "candlestick"
				}], {}, {
					title: { text: "Ratio" },
				});

				await percentGraph.update(date);
				percentHistory.append(percentGraph);
			}
			details.append(percentHistory);
		}
		main.append(details);
	}
});