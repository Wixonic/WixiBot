import firebase from "/lib/firebase.js";
import { init } from "/lib/main.js";
import { path } from "/lib/path.js";
import request from "/lib/request.js";

addEventListener("DOMContentLoaded", async () => {
	await init();

	const credentials = await firebase.getUser();
	if (!credentials.valid) return location.href = new URL(`/login/?redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.accounts : path.accounts);
	const user = credentials.user;
	console.log(user);

	const main = document.querySelector("main");

	if (!user.emailVerified) {
		const banner = document.createElement("div");
		banner.classList.add("banner");

		const text = document.createElement("div");
		text.innerHTML = "Your email address has not yet been verified.<br />To help protect both your account and the platform, and to ensure full access to all available features, please verify your email address by clicking the button below.<br />A verification eamil will be sent to your registered address.";

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
		main.append(banner);
	}

	const discordLink = await firebase.isLinked("discord");
	if (discordLink) {
		// Name

		// Leaderboard

		// User stats

		main.append();
	} else {
		const discord = document.createElement("button");
		discord.classList.add("button", "discord");
		discord.innerHTML = `Link your account to ${(await request("GET", new URL("/icon/discord.text.svg", localEnvironment ? path.local.assets : path.assets), "text", "image/svg+xml", null, 3600)).response}`;
		discord.addEventListener("click", async () => {
			if (!discord.disabled) {
				discord.disabled = true;
				location.href = new URL(`/discord/link/?uid=${user.uid}&redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.server : path.server);
			}
		});

		// Join WixiLand

		main.append(discord);
	}

	// See source code
});;