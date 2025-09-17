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

		const user = document.createElement("button");
		user.classList.add("button");
		user.disabled = location.pathname == "/kcmaths/user/";
		user.innerHTML = "Utilisateur";
		user.addEventListener("click", async () => {
			if (!user.disabled) {
				user.disabled = true;
				location.href = "/kcmaths/user/";
			}
		});
		nav.append(user);
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
		const open = [];
		const close = [];
		const high = [];
		const low = [];
		const text = [];

		for (const i in kcCoinsRate) {
			const entry = kcCoinsRate[i];

			const entryDate = new Date(`${entry.date.slice(4)}-${entry.date.slice(2, 4)}-${entry.date.slice(0, 2)}`);
			date.push(entryDate);

			close.push(entry.total ?? 0);

			const previous = kcCoinsRate[i - 1];
			open.push(previous?.total ?? 0);

			high.push(Math.max(open[i], close[i]));
			low.push(Math.min(open[i], close[i]));

			const diff = (entry.total ?? 0) - (previous?.total ?? 0);
			text.push(`${entry.total ?? 0} KCC<br />${diff >= 0 ? "+" : "-"}${Math.abs(diff)} KCC`);
		}

		const graph = document.createElement("div");
		graph.classList.add("graph", "fade", "slide");
		Plotly.newPlot(graph, [{
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
		}], {
			autosize: false,
			width: Math.min(innerWidth - 150, 800),
			height: 500,
			dragmode: "pan",
			margin: { l: 50, r: 0, t: 20, b: 50 },
			showlegend: false,
			xaxis: {
				autorange: true,
				showgrid: false,
				rangeslider: {
					visible: false
				},
				tickformat: "%d/%m",
				title: { text: "Date" },
				type: "date"
			},
			yaxis: {
				autorange: true,
				fixedrange: true,
				title: { text: "KCC" },
				type: "linear"
			}
		}, {
			displaylogo: false,
			locale: "fr",
			displayModeBar: false,
			responsive: true,
			scrollZoom: true
		});

		graph.isUpdating = false;
		graph.update = async () => {
			if (!graph.isUpdating) {
				graph.isUpdating = true;

				const updateLayout = {};

				const startTime = new Date(graph._fullLayout.xaxis.range[0]).getTime();
				const endTime = new Date(graph._fullLayout.xaxis.range[1]).getTime();

				let yMin = Infinity;
				let yMax = -Infinity;

				for (let i = 0; i < date.length; i++) {
					const currentDate = new Date(date[i]).getTime();
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
				graph.isUpdating = false;
			}
		};

		graph.on("plotly_relayout", async (data) => {
			if (data["xaxis.range[0]"] || data["xaxis.range[1]"]) await graph.update();
		});

		await graph.update();

		main.append(graph);
	}
});