import { safeStringify } from "./utils.ts";

export const colors = {
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

	get debug(): string {
		return this.dim + this.white;
	},
	get error(): string {
		return this.red;
	},
	get info(): string {
		return this.cyan;
	},
	get warn(): string {
		return this.yellow;
	}
};

export interface LoggerOptions {
	displayDate: boolean;
	displayLevel: boolean;
}

export interface Logger extends LoggerOptions {
	debug(...any: unknown[]): void;
	error(...any: unknown[]): void;
	info(...any: unknown[]): void;
	warn(...any: unknown[]): void;
	clone(prefixGenerator: string | (() => string)): Logger;
	jump(): void;
}

const rawLog = (level: string, color: string, options: LoggerOptions, ...any: unknown[]): void => {
	const logParts: string[] = [];

	if (options.displayLevel) logParts.push(color + level + colors.reset);

	if (options.displayDate) {
		const now = new Date();
		logParts.push(
			colors.dim + colors.white +
			now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" }),
			now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }) + colors.reset
		);
	}

	const formatItem = (item: unknown): string => {
		if (item instanceof Error) {
			let str = item.stack || String(item);
			if (item.cause) str += `\nCaused by: ${formatItem(item.cause)}`;
			return str;
		}

		if (typeof item === "object" && item !== null) {
			if ("cause" in item) {
				const causeOutput = formatItem((item as Record<string, unknown>).cause);
				const rest = { ...(item as Record<string, unknown>) };
				delete rest.cause;

				if (Object.keys(rest).length === 0) return `\nCaused by: ${causeOutput}`;
				return safeStringify(rest) + `\nCaused by: ${causeOutput}`;
			}
			return safeStringify(item);
		}

		return String(item);
	};

	const argsJoined = any.map(formatItem).join(" ");

	logParts.push(color + argsJoined + colors.reset);

	console.log(logParts.join(" "));
};

const createLogger = (options: Partial<LoggerOptions> & { prefix?: string | (() => string) } = {}): Logger => {
	const mergedOptions: LoggerOptions = {
		displayDate: options.displayDate ?? true,
		displayLevel: options.displayLevel ?? true,
	};

	const injectPrefix = (args: unknown[]): unknown[] => {
		if (!options.prefix) return args;
		const prefixStr = typeof options.prefix === "function" ? options.prefix() : options.prefix;
		return [prefixStr, ...args];
	};

	return {
		debug: (...any) => rawLog("[DEBUG]", colors.debug, mergedOptions, ...injectPrefix(any)),
		error: (...any) => rawLog("[ERROR]", colors.error, mergedOptions, ...injectPrefix(any)),
		info: (...any) => rawLog(" [INFO]", colors.info, mergedOptions, ...injectPrefix(any)),
		warn: (...any) => rawLog(" [WARN]", colors.warn, mergedOptions, ...injectPrefix(any)),
		clone: (prefixGenerator) => createLogger({
			...mergedOptions,
			prefix: () => {
				const oldPrefix = options.prefix ? (typeof options.prefix === "function" ? options.prefix() : options.prefix) : "";
				const newPrefix = typeof prefixGenerator === "function" ? prefixGenerator() : prefixGenerator;
				return oldPrefix ? `${oldPrefix} ${newPrefix}` : newPrefix;
			}
		}),
		jump: () => console.log(""),
		...mergedOptions
	};
};

export const logger = createLogger();