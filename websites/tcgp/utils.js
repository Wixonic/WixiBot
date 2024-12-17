const wait = (time = 0) => new Promise((resolve) => setTimeout(() => resolve("Finished waiting"), time * 1000));

export {
	wait
};