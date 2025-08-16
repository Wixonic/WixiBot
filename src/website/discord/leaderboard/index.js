import firebase from "/lib/firebase.js";
import { init } from "/lib/main.js";
import { path } from "/lib/path.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const credentials = await firebase.getUser();
	if (!credentials.valid) return location.href = new URL(`/login/?redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.accounts : path.accounts);
	const user = credentials.user;

	const main = document.querySelector("main");

	const discordSection = document.createElement("section");
	discordSection.classList.add("fade");
	discordSection.id = "discord";
	main.append(discordSection);

	if (!user.emailVerified) {
		const banner = document.createElement("div");
		banner.classList.add("banner");

		const text = document.createElement("div");
		text.innerHTML = "Your email address has not yet been verified.<br />To help protect both your account and the platform, and to ensure full access to all available features, please verify your email address by clicking the button below.<br />A verification email will be sent to your registered address.";

		const button = document.createElement("button");
		button.classList.add("button");
		button.innerHTML = "Send verification email";
		button.addEventListener("click", async () => {
			if (!button.disabled) {
				button.disabled = true;
				await request("POST", new URL("/auth/verify/", localEnvironment ? path.local.functions : path.functions), "json", "application/json", null, -1, true);
				button.disabled = false;
			}
		});

		banner.append(text, button);
		discordSection.append(banner);
	}

	const discordLink = await firebase.isLinked("discord");
	if (!discordLink) location.href = new URL(`/discord/link/?uid=${user.uid}&redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.server : path.server);

	const createMemberEntry = (id, rankData) => {
		const member = document.createElement("a");
		member.classList.add("member");
		member.href = `/discord/user?id=${rankData.id}`;

		if (discordLink.id == rankData.id) member.classList.add("self");

		const rank = document.createElement("div");
		rank.classList.add("rank");
		rank.innerText = id + 1;
		member.append(rank);

		const points = document.createElement("div");
		points.classList.add("points");
		points.innerText = Math.ceil(rankData.points);
		member.append(points);

		request("GET", new URL(`/discord/api/user?id=${rankData.id}`, localEnvironment ? path.local.server : path.server), "json", "application/json").then(async (data) => {
			if (data.status != 200) return;
			const memberData = data.response;

			try {
				const image = document.createElement("img");
				const imageData = await request("GET", memberData.avatar, "blob");
				if (imageData.status != 200) throw `Status: ${imageData.status}`;
				image.src = URL.createObjectURL(imageData.response);
				image.onload = () => URL.revokeObjectURL(image.src);
				member.append(image);
			} catch (e) {
				console.warn("Failed to load avatar: " + e);
			}

			const name = document.createElement("div");
			name.classList.add("name");
			name.innerText = memberData.displayName ?? memberData.username;
			member.append(name);
		});

		return member;
	};

	const params = new URLSearchParams(location.search);
	const category = params.get("category") ?? "month";

	const nav = document.createElement("nav");
	nav.classList.add("fade");

	{
		const monthly = document.createElement("button");
		monthly.classList.add("button");
		monthly.disabled = category == "month";
		monthly.innerHTML = "Monthly";
		monthly.addEventListener("click", async () => {
			if (!monthly.disabled) {
				monthly.disabled = true;
				location.href = "/discord/leaderboard/?category=month";
			}
		});
		nav.append(monthly);

		const global = document.createElement("button");
		global.classList.add("button");
		global.disabled = category == "global";
		global.innerHTML = "Global";
		global.addEventListener("click", async () => {
			if (!global.disabled) {
				global.disabled = true;
				location.href = "/discord/leaderboard/?category=global";
			}
		});
		nav.append(global);
	}

	main.append(nav);

	let part = 0;
	let count = 0;
	let total = 0;
	let partLength = 10;

	const title = document.createElement("h2");
	title.classList.add("fade", "slide");
	title.innerHTML = `${{ month: "Monthly", global: "Global" }[category]} Leaderboard`;
	main.append(title);

	const leaderboardContainer = document.createElement("div");
	leaderboardContainer.classList.add("leaderboard", "fade", "slide");
	main.append(leaderboardContainer);

	const button = document.createElement("button");
	button.classList.add("button", "fade", "slide");
	button.disabled = true;
	button.innerHTML = "View more";
	button.addEventListener("click", async () => {
		if (!button.disabled) {
			button.disabled = true;
			await loadLeaderboardPart();
		}
	});
	main.append(button);

	const loadLeaderboardPart = async () => {
		const leaderboardRequest = await request("GET", new URL(`/discord/api/leaderboard?start=${part * partLength}&end=${(part + 1) * partLength}&category=${category}`, localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

		if (leaderboardRequest.status == 200) {
			part++;

			const leaderboard = leaderboardRequest.response;

			for (const rankData of leaderboard[category]) {
				const member = createMemberEntry(count++, rankData);
				leaderboardContainer.append(member);
			}

			total = leaderboard.total[category];
		}

		button.disabled = !(count < total);
	};

	await loadLeaderboardPart();
});