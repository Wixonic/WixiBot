const error = (message = "Something went wrong.", value = "Reload page", listener = () => location.reload()) => {
	const error = document.createElement("div");
	error.id = "error";
	error.innerHTML = `<h1>An error occured</h1><p>${message}</p>`;

	const button = document.createElement("button");
	button.innerText = value;
	button.addEventListener("click", listener);
	error.append(button);

	document.body.innerHTML = "";
	document.body.append(error);
};

export {
	error
};