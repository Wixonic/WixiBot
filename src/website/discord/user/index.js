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

	const params = new URLSearchParams(location.search);
	const userId = params.get("id") ?? discordLink.id;

	const createMemberEntry = (id, rankData, relative) => {
		const member = document.createElement("a");
		member.classList.add("member");
		member.setAttribute("relative", relative);
		member.href = `/discord/user?id=${rankData.id}`;

		if (userId == rankData.id) member.classList.add("self");

		const rank = document.createElement("div");
		rank.classList.add("rank");
		rank.innerHTML = id + 1;
		member.append(rank);

		const points = document.createElement("div");
		points.classList.add("points");
		points.innerHTML = Math.ceil(rankData.points);
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

	const discordUserResponse = await request("GET", new URL(`/discord/api/user?id=${userId}`, localEnvironment ? path.local.server : path.server), "json", "application/json");

	if (discordUserResponse.status == 200) {
		const discordUser = discordUserResponse.response;

		const title = document.createElement("h2");
		title.classList.add("fade", "slide");
		title.innerText = discordUser.displayName ?? discordUser.username;
		main.append(title);

		const headTitle = document.head.querySelector("title");
		headTitle.innerText = headTitle.innerText.replace("User", discordUser.displayName ?? discordUser.username);

		const discordUserRankResponse = await request("GET", new URL(`/discord/api/user/rank?id=${userId}`, localEnvironment ? path.local.server : path.server), "json", "application/json");

		if (discordUserRankResponse.status == 200) {
			const discordUserRank = discordUserRankResponse.response;

			if (discordUserRank.rank.month >= 0) {
				const leaderboardContainer = document.createElement("div");
				leaderboardContainer.classList.add("leaderboard", "fade", "slide");
				main.append(leaderboardContainer);

				const monthlyLeaderboardRequest = await request("GET", new URL(`/discord/api/leaderboard?start=${Math.max(discordUserRank.rank.month - 2, 0)}&end=${Math.max(discordUserRank.rank.month - 2, 0) + 5}&category=month`, localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

				if (monthlyLeaderboardRequest.status == 200) {
					const leaderboard = monthlyLeaderboardRequest.response;

					await (async () => {
						const section = document.createElement("section");
						section.classList.add("fade");
						main.append(section);

						const title = document.createElement("h3");
						title.classList.add("fade", "slide");
						title.innerHTML = "Monthly Leaderboard";
						section.append(title);

						const leaderboardContainer = document.createElement("div");
						leaderboardContainer.classList.add("leaderboard", "fade", "slide");

						let count = 0;
						for (const rankData of leaderboard.month) {
							const relative = Math.max(discordUserRank.rank.month - 2, 0) -
								(discordUserRank.rank.month - 2) +
								count - 2;
							const member = createMemberEntry(Math.max(discordUserRank.rank.month - 2, 0) + count++, rankData, relative);
							leaderboardContainer.append(member);
						}

						section.append(leaderboardContainer);

						if (leaderboard.total.month > 5) {
							const button = document.createElement("button");
							button.classList.add("button", "fade", "slide");
							button.innerHTML = "View more";
							button.addEventListener("click", () => {
								if (!button.disabled) {
									button.disabled = true;
									location.href = "/discord/leaderboard/?category=month";
								}
							});
							section.append(button);
						}
					})();
				}
			}

			if (discordUserRank.rank.global >= 0) {
				const globalLeaderboardRequest = await request("GET", new URL(`/discord/api/leaderboard?start=${Math.max(discordUserRank.rank.global - 2, 0)}&end=${Math.max(discordUserRank.rank.global - 2, 0) + 5}&category=global`, localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

				if (globalLeaderboardRequest.status == 200) {
					const leaderboard = globalLeaderboardRequest.response;

					await (async () => {
						const section = document.createElement("section");
						section.classList.add("fade");
						main.append(section);

						const title = document.createElement("h3");
						title.classList.add("fade", "slide");
						title.innerHTML = "Global Leaderboard";
						section.append(title);

						const leaderboardContainer = document.createElement("div");
						leaderboardContainer.classList.add("leaderboard", "fade", "slide");

						let count = 0;
						for (const rankData of leaderboard.global) {
							const relative = Math.max(discordUserRank.rank.global - 2, 0) -
								(discordUserRank.rank.global - 2) +
								count - 2;
							const member = createMemberEntry(Math.max(discordUserRank.rank.global - 2, 0) + count++, rankData, relative);
							leaderboardContainer.append(member);
						}

						section.append(leaderboardContainer);

						if (leaderboard.total.global > 5) {
							const button = document.createElement("button");
							button.classList.add("button", "fade", "slide");
							button.innerHTML = "View more";
							button.addEventListener("click", () => {
								if (!button.disabled) {
									button.disabled = true;
									location.href = "/discord/leaderboard/?category=global";
								}
							});
							section.append(button);
						}
					})();
				}
			}
		}
	}
});