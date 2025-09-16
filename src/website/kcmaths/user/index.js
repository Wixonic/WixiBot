import { init } from "/lib/main.js";

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
});