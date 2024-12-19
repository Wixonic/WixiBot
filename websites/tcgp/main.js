import { error } from "./error.js";
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

			console.info("User data:", user);

			const droppedCards = {};

			for (const opening of user.openings) {
				if (!droppedCards[opening.expansion]) droppedCards[opening.expansion] = {};

				if (opening.type == 0 || opening.type == 3) {
					for (const card of opening.cards) droppedCards[opening.expansion][card] = typeof droppedCards[opening.expansion][card] == "number" ? droppedCards[opening.expansion][card] + 1 : 1;
				} else if (opening.type == 1 || opening.type == 2) {
					for (const booster of opening.boosters) {
						for (const card of booster.drops) droppedCards[opening.expansion][card] = typeof droppedCards[opening.expansion][card] == "number" ? droppedCards[opening.expansion][card] + 1 : 1;
					}
				}
			}

			console.info("User drops:", droppedCards);

			const home = () => {
				document.body.innerHTML = "";

				const disconnectButton = document.createElement("button");
				disconnectButton.classList.add("back");
				disconnectButton.innerHTML = "Disconnect";
				disconnectButton.addEventListener("click", () => {
					if (confirm("Do you want to log out?")) {
						localStorage.clear();
						location.reload();
					}
				});

				const nav = document.createElement("nav");

				const cardsButton = document.createElement("button");
				cardsButton.innerHTML = "Cards";
				cardsButton.addEventListener("click", cards);

				const dropsButton = document.createElement("button");
				dropsButton.innerHTML = "Drops";
				dropsButton.addEventListener("click", drops);

				const addButton = document.createElement("button");
				addButton.innerHTML = "Add new";
				addButton.addEventListener("click", add);

				nav.append(cardsButton, dropsButton, addButton);

				document.body.append(disconnectButton, nav);
			};

			const cards = () => {
				document.body.innerHTML = "";

				const backButton = document.createElement("button");
				backButton.classList.add("back");
				backButton.innerHTML = "Back";
				backButton.addEventListener("click", home);

				const title = document.createElement("h1");
				title.innerHTML = "Cards";

				const search = document.createElement("input");
				search.type = "text";
				search.placeholder = "Search cards...";
				search.addEventListener("input", () => displayCards(search.value.toLowerCase()));

				const cards = document.createElement("div")
				cards.id = "cards";

				for (const expansionId in data.expansions) {
					const expansion = document.createElement("div");
					expansion.classList.add("expansion");
					expansion.id = expansionId;

					for (const pokémonId in data.expansions[expansionId].pokémons) {
						const pokémon = data.expansions[expansionId].pokémons[pokémonId];
						const count = droppedCards[expansionId][Number(pokémonId) + 1];
						const id = `${expansionId}-${Number(pokémonId) + 1}`;

						const pokémonCard = document.createElement("div");
						pokémonCard.classList.add("card");
						if (!count) pokémonCard.classList.add("unobtained");
						pokémonCard.id = id;

						const pokémonCardName = document.createElement("div");
						pokémonCardName.classList.add("name");
						pokémonCardName.innerText = pokémon.name;

						const pokémonCardCount = document.createElement("div");
						pokémonCardCount.classList.add("count");
						pokémonCardCount.innerText = `${count ? `${count == 1 ? "One" : count} card${count == 1 ? "" : "s"}` : "Not obtained"}`;

						const pokémonCardId = document.createElement("div");
						pokémonCardId.classList.add("id");
						pokémonCardId.innerText = id;

						const pokémonCardIllustration = new Image();
						pokémonCardIllustration.src = new URL(`/tcgp/illustration/${expansionId}/${Number(pokémonId) + 1}.jpeg`, location.origin);
						pokémonCardIllustration.addEventListener("error", () => {
							pokémonCardIllustration.remove();
							const pokémonCardIllustrationFallback = new Image();
							pokémonCardIllustrationFallback.src = new URL(`/tcgp/illustration/fallback.jpeg`, location.origin);
							pokémonCard.append(pokémonCardIllustrationFallback);
						});

						pokémonCard.append(pokémonCardName, pokémonCardCount, pokémonCardIllustration, pokémonCardId);

						expansion.append(pokémonCard);
					}

					cards.append(expansion);
				}

				document.body.append(backButton, title, search, cards);

				const displayCards = (query = "") => {
					for (const expansionId in data.expansions) {
						for (const pokémonId in data.expansions[expansionId].pokémons) {
							const pokémon = data.expansions[expansionId].pokémons[pokémonId];
							const id = `${expansionId}-${Number(pokémonId) + 1}`;

							let displayed = query.length == 0;

							for (const part of query.split(" ")) {
								if (part.length > 0) {
									displayed = displayed ||
										pokémon.name.toLowerCase().includes(part) ||
										data.rarities.cards[pokémon.rarity].name.toLowerCase().startsWith(part) ||
										data.types[pokémon.type].name.toLowerCase().includes(part) ||
										String(Number(pokémonId) + 1).startsWith(part);
								}
							}

							document.getElementById(id).style.display = displayed ? "" : "none";
						}
					}
				};

				displayCards();
			};

			const drops = () => {
				document.body.innerHTML = "";

				const backButton = document.createElement("button");
				backButton.classList.add("back");
				backButton.innerHTML = "Back";
				backButton.addEventListener("click", home);

				document.body.append(backButton);
			};

			const add = () => {
				document.body.innerHTML = "";

				const backButton = document.createElement("button");
				backButton.classList.add("back");
				backButton.innerHTML = "Back";
				backButton.addEventListener("click", home);

				document.body.append(backButton);
			};

			home();
		} else {
			const form = document.createElement("form");
			form.id = "wixkey-form";
			form.innerHTML = "<h1>TCGP Pokédex</h1>"

			const input = document.createElement("input");
			input.type = "password";
			input.placeholder = "Enter your WixKey...";

			const button = document.createElement("input");
			button.type = "submit";

			form.append(input, button);

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