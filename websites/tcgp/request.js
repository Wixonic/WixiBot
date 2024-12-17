const requestJSON = (path = "/", method = "GET", headers = {}, body) => new Promise((resolve, reject) => {
	const xhr = new XMLHttpRequest();

	xhr.open(method, new URL(`/tcgp/${path[0] == "/" ? path.replace("/", "") : path}`, location.origin), true);

	for (const name in headers) xhr.setRequestHeader(name, headers[name]);

	xhr.addEventListener("load", () => {
		try {
			resolve(JSON.parse(xhr.responseText));
		} catch (e) {
			console.error(e);
			resolve(false);
		}
	});
	xhr.send(body);
});

export { requestJSON };