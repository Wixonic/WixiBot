const abort = (time = 0) => new Promise((_, reject) => wait(time).then(() => reject("Aborted")));

const clone = (obj, cloned = new WeakMap()) => {
	if (obj === null || typeof obj !== "object") return obj;
	if (cloned.has(obj)) return cloned.get(obj);

	const clonedObj = Array.isArray(obj) ? [] : {};
	cloned.set(obj, clonedObj);

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) clonedObj[key] = clone(obj[key], cloned);
	}

	return clonedObj;
};

const wait = (time = 0) => new Promise((resolve) => setTimeout(() => resolve("Finished waiting"), time * 1000));

module.exports = {
	abort,
	clone,
	wait
};