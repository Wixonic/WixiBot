import firebase from "/lib/firebase.js";
import loader from "/lib/loader.js";
import { init } from "/lib/main.js";
import { path } from "/lib/path.js";
import request from "/lib/request.js";
import { RichLink } from "/lib/rich.js";

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
				await request("POST", new URL(`${localEnvironment ? "/wixonic-website-2/europe-west1/httpServer" : ""}/auth/verify/`, localEnvironment ? path.local.functions : path.functions), "json", "application/json", null, -1, true);
				button.disabled = false;
			}
		});

		banner.append(text, button);
		discordSection.append(banner);
	}

	const discordLink = await firebase.isLinked("discord");
	if (discordLink) {
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
					const imageData = await request("GET", memberData.avatar, "blob", "image/*");
					if (imageData.status != 200) throw `Status: $(imageData.status}`;
					image.src = URL.createObjectURL(imageData.response);
					image.onload = () => URL.revokeObjectURL(image.src);
					member.append(image);
				} catch (e) {
					console.warn("Failed to load avatar: " + e);
				}

				const name = document.createElement("div");
				name.classList.add("name");
				name.innerText = memberData.displayName;
				member.append(name);
			});

			return member;
		};

		const leaderboardRequest = await request("GET", new URL("/discord/api/leaderboard?start=0&end=5", localEnvironment ? path.local.server : path.server), "json", "application/json", null, 600);

		if (leaderboardRequest.status == 200) {
			const leaderboard = leaderboardRequest.response;

			const leaderboardCount = {
				month: 0,
				global: 0
			};

			await (async () => {
				const section = document.createElement("section");
				section.classList.add("fade");
				main.append(section);

				const title = document.createElement("h2");
				title.classList.add("fade", "slide");
				title.innerHTML = "Monthly Leaderboard";
				section.append(title);

				const leaderboardContainer = document.createElement("div");
				leaderboardContainer.classList.add("leaderboard", "fade", "slide");

				for (const rankData of leaderboard.month) {
					const member = createMemberEntry(leaderboardCount.month++, rankData);
					leaderboardContainer.append(member);
				}

				section.append(leaderboardContainer);

				if (leaderboard.total.month > 5) {
					const button = document.createElement("button");
					button.classList.add("button");
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

			await (async () => {
				const section = document.createElement("section");
				section.classList.add("fade");
				main.append(section);

				const title = document.createElement("h2");
				title.classList.add("fade", "slide");
				title.innerHTML = "Global Leaderboard";
				section.append(title);

				const leaderboardContainer = document.createElement("div");
				leaderboardContainer.classList.add("leaderboard", "fade", "slide");

				for (const rankData of leaderboard.global) {
					const member = createMemberEntry(leaderboardCount.global++, rankData);
					leaderboardContainer.append(member);
				}

				section.append(leaderboardContainer);

				if (leaderboard.total.global > 5) {
					const button = document.createElement("button");
					button.classList.add("button");
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
	} else {
		document.querySelector("#discordProfile").remove();

		await (async () => {
			const title = document.createElement("h2");
			title.classList.add("fade", "slide");
			title.innerHTML = "Discord";
			discordSection.append(title);

			const description = document.createElement("p");
			description.classList.add("fade", "slide");
			description.innerHTML = "Linking your Discord account unlocks exclusive features and rewards. <b>1,000 points</b> will be credited to your account after linking.";
			discordSection.append(description);

			const discord = document.createElement("button");
			discord.classList.add("button", "discord", "fade", "slide");
			discord.innerHTML = `Link your account to ${(await request("GET", new URL("/icon/discord.text.svg", localEnvironment ? path.local.assets : path.assets), "text", "image/svg+xml", null, 3600)).response}`;
			discord.addEventListener("click", async () => {
				if (!discord.disabled) {
					discord.disabled = true;
					location.href = new URL(`/discord/link/?uid=${user.uid}&redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.server : path.server);
				}
			});
			discordSection.append(discord);
		})();

		await (async () => {
			const section = document.createElement("section");
			section.classList.add("fade");
			section.id = "wixiland";
			main.append(section);

			const title = document.createElement("h2");
			title.classList.add("fade", "slide");
			title.innerHTML = "WixiLand";
			section.append(title);

			const description = document.createElement("p");
			description.classList.add("fade", "slide");
			description.innerHTML = "Land with one click in a futuristic universe and be part of a wonderful community on Discord, or anywhere. Find a place in it, or watch from afar what's happening. In either case, you are welcome.<br /><br />";
			section.append(description);

			const link = await RichLink(new URL("/discord", localEnvironment ? path.local.redirects : path.redirects));
			link.classList.add("fade", "button");
			link.target = "_blank";
			link.innerHTML = "Discover WixiLand";
			description.append(link);

			const image = await loader.image(new URL("/image/discord.png", localEnvironment ? path.local.assets : path.assets));
			image.alt = "Robot holding a sign.";
			image.classList.add("fade", "slide");
			section.append(image);
		})();
	}

	// See source code
});;