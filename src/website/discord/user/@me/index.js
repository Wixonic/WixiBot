import firebase from "/lib/firebase.js";
import { path } from "/lib/path.js";

addEventListener("DOMContentLoaded", async () => {
	const credentials = await firebase.getUser();
	if (!credentials.valid) return location.href = new URL(`/login/?redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.accounts : path.accounts);
	const user = credentials.user;

	const discordLink = await firebase.isLinked("discord");
	if (!discordLink) location.href = new URL(`/discord/link/?uid=${user.uid}&redirect=${encodeURIComponent(location.href)}`, localEnvironment ? path.local.server : path.server);
	else location.href = new URL(`/discord/user?id=${discordLink.id}`, localEnvironment ? path.local.server : path.server);
});