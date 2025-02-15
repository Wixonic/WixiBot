const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	underscore: "\x1b[4m",
	blink: "\x1b[5m",
	reverse: "\x1b[7m",
	hidden: "\x1b[8m",

	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",

	regexp: /\x1b\[\d+(;\d+)*m/g
};

/**
 * @param {string} level
 * @param {string} color
 * @param  {...string} any
 * @returns {string}
 */
const rawLog = (level, color, ...any) => {
	const now = new Date();
	console.log(`${color}${level}${colors.reset} ${colors.dim + colors.white}${now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}${colors.reset} ${color}${[...any].join(" ")}${colors.reset}`);
};

/**
 * @type {Logger}
 */
const log = {
	debug: (...any) => rawLog("[DEBUG]", colors.dim + colors.white, ...any),
	info: (...any) => rawLog(" [INFO]", colors.cyan, ...any),
	error: (...any) => rawLog("[ERROR]", colors.red, ...any),
	warn: (...any) => rawLog(" [WARN]", colors.yellow, ...any)
};

log.basicIndent = (...indent) => {
	return {
		debug: (...any) => log.debug(...indent, ...any),
		info: (...any) => log.info(...indent, ...any),
		error: (...any) => log.error(...indent, ...any),
		warn: (...any) => log.warn(...indent, ...any),
		basicIndent: (...any) => log.basicIndent(...indent, ...any)
	};
};

module.exports = {
	colors,
	log,
	rawLog
};