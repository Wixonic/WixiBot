import { getSettings } from "./settings.ts";
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

export interface WebhookOptions {
	mention?: string;
	suppressNotifications?: boolean;
};

const sendWebhook = async (level: string, message: string, options: WebhookOptions = {}): Promise<void> => {
	try {
		const settings = getSettings();
		if (!settings.discord?.webhookUrl) return;

		const prefix = options.mention ? `${options.mention} ` : "";
		const safeMessage = message.replaceAll("```", "` ` `");
		const maxMessageLength = 2000 - prefix.length - 8 - level.trim().length - 2;
		const truncated = safeMessage.length > maxMessageLength ? safeMessage.slice(0, maxMessageLength - 3) + "..." : safeMessage;

		await fetch(settings.discord.webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content: `${prefix}\`\`\`\n${level.trim()}: ${truncated}\n\`\`\``,
				flags: options.suppressNotifications ? 4096 : undefined,
				allowed_mentions: options.mention ? { parse: ["everyone"] } : { parse: [] }
			})
		});
	} catch { }
};

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

const rawLog = (level: string, color: string, options: LoggerOptions, webhookOptions?: WebhookOptions, ...any: unknown[]): void => {
	const logParts: string[] = [];

	if (options.displayLevel) logParts.push(color + level + colors.reset);

	if (options.displayDate) {
		const now = new Date();
		logParts.push(
			colors.dim + colors.white +
			now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" }),
			now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }) +
			colors.reset
		);
	}

	const argsJoined = any.map(formatItem).join(" ");

	logParts.push(color + argsJoined + colors.reset);
	console.log(logParts.join(" "));

	if (webhookOptions) sendWebhook(level, argsJoined, webhookOptions);
};

const createLogger = (options: Partial<LoggerOptions> & { prefix?: string | (() => string) } = {}): Logger => {
	const mergedOptions: LoggerOptions = {
		displayDate: options.displayDate ?? true,
		displayLevel: options.displayLevel ?? true,
	};

	const injectPrefix = (args: unknown[]): unknown[] => {
		if (options.prefix) {
			const prefixStr = typeof options.prefix === "function" ? options.prefix() : options.prefix;
			return [prefixStr, ...args];
		}

		return args;
	};

	return {
		debug: (...any) => rawLog("[DEBUG]", colors.debug, mergedOptions, undefined, ...injectPrefix(any)),
		error: (...any) => rawLog("[ERROR]", colors.error, mergedOptions, { mention: "@everyone" }, ...injectPrefix(any)),
		info: (...any) => rawLog(" [INFO]", colors.info, mergedOptions, { suppressNotifications: true }, ...injectPrefix(any)),
		warn: (...any) => rawLog(" [WARN]", colors.warn, mergedOptions, {}, ...injectPrefix(any)),
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