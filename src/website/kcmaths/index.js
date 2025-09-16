import { init } from "/lib/main.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const main = document.querySelector("main");

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
		const title = document.createElement("h2");
		title.classList.add("fade", "slide");
		title.innerHTML = "Cours du KCCoin";
		main.append(title);

		const kcCoinsRateRequest = await request("GET", "/kcmaths/api/kccoins/rate", "json", "application/json", null, 600);
		const kcCoinsRate = kcCoinsRateRequest.response;

		const date = [];
		const close = [];
		const text = [];

		for (const entry of kcCoinsRate) {
			const entryDate = new Date(`${entry.date.slice(4)}-${entry.date.slice(2, 4)}-${entry.date.slice(0, 2)}`);
			date.push(entryDate);
			close.push(entry.total);
			text.push(`${entry.total} KC`);
		}

		const open = Array.from(close);
		open.unshift(0);
		open.pop();

		console.log(date, open, close);

		const graph = document.createElement("div");
		graph.classList.add("graph");
		Plotly.newPlot(graph, [{
			x: date,
			open,
			low: close,
			high: close,
			close,

			hovertext: text,
			hoverinfo: "text",

			decreasing: { line: { color: "#F00" } },
			increasing: { line: { color: "#0C0" } },
			line: { color: "#06F" },

			type: "candlestick",
			xaxis: "x",
			yaxis: "y"
		}], {
			dragmode: "pan",
			showlegend: false,
			xaxis: {
				autorange: true,
				type: "date"
			},
			yaxis: {
				autorange: true,
				type: "linear"
			}
		});
		main.append(graph);
	}
});