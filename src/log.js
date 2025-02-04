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
	crimson: "\x1b[38m"
};

const log = (level, color, ...any) => {
	const now = new Date();
	console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${colors.dim + colors.white}${now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}${colors.reset} ${color}${[...any].join(" ")}${colors.reset}`);
};

log.debug = (...any) => log("debug", colors.dim + colors.gray, ...any);
log.info = (...any) => log("info", colors.cyan, ...any);
log.error = (...any) => log("error", colors.red, ...any);
log.warn = (...any) => log("warn", colors.dim + colors.yellow, ...any);

module.exports = log;