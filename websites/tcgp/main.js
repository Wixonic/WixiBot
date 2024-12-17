import { error } from "./error.js";
import { getIllustrationURL, getFallbackIllustrationURL } from "./path.js";
import { requestJSON } from "./request.js";
import "./types.js";

const main = async () => {
	try {
		/**
		 * @type {Data}
		 */
		const data = await requestJSON("/data.json");

		const count = {
			expansions: 0,
			boosters: 0,
			pokémons: 0
		};

		for (const id in data.expansions) {
			count.expansions++;
			count.boosters += data.expansions[id].boosters.length;
			count.pokémons += data.expansions[id].pokémons.length;
		}

		console.info(`${count.expansions} expansion${count.expansions > 1 ? "s" : ""} loaded`);
		console.info(`${count.boosters} booster${count.boosters > 1 ? "s" : ""} loaded`);
		console.info(`${count.pokémons} Pokémon${count.pokémons > 1 ? "s" : ""} loaded`);

		const WixKey = localStorage.getItem("wixkey");

		if (WixKey) {
			/**
			 * @type {User}
			 */
			const user = await requestJSON("/user/", "GET", {
				WixKey
			});

			if (!user) return error("Failed to authenticate.", "Reset", () => {
				localStorage.clear();
				location.reload();
			});

			console.log(user);
		} else {
			const form = document.createElement("form");
			form.id = "wixkey-form";
			form.innerHTML = "<h1>TCGP Pokédex</h1>"

			const input = document.createElement("input");
			input.type = "password";
			input.placeholder = "Enter your WixKey...";
			form.append(input);

			const button = document.createElement("input");
			button.type = "submit";
			form.append(button);

			form.addEventListener("submit", (event) => {
				event.preventDefault();

				if (input.value.length > 0) {
					localStorage.setItem("wixkey", input.value);
					location.reload();
				}
			});
			document.body.append(form);
		}
	} catch (e) {
		console.error(e);
		error("Failed to connect to server.");
	}
};

main();