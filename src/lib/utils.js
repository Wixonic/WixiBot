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

/**
 * @param {number} time 
 * @returns {string}
 */
const displayTime = (time) => {
	const units = [
		{ label: "year", seconds: 365 * 24 * 60 * 60 },
		{ label: "month", seconds: 30 * 24 * 60 * 60 },
		{ label: "day", seconds: 24 * 60 * 60 },
		{ label: "hour", seconds: 60 * 60 },
		{ label: "minute", seconds: 60 },
		{ label: "second", seconds: 1 }
	];

	for (const unit of units) {
		const quotient = Math.floor(time / unit.seconds);
		if (quotient > 0) return `${quotient} ${unit.label}${quotient > 1 ? "s" : ""}`;
	}

	return "0 seconds";
};

/**
 * @param {string} hex
 * @returns {number}
 */
const hexToIntColor = (hex) => {
	try {
		return parseInt(hex.replace("#", "0x"), 16);
	} catch {
		return 0;
	}
};

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
const wait = (milliseconds) => new Promise((resolve) => setTimeout(() => resolve(), milliseconds));

module.exports = {
	clone,
	displayTime,
	hexToIntColor,
	wait
};