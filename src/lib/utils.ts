import { fileURLToPath } from "node:url";
import { type ApplicationCommand, type ApplicationCommandOption, ApplicationCommandOptionType } from "discord.js";

export const getStoragePath = (...subPaths: string[]) => join(fileURLToPath(new URL("../../storage", import.meta.url)), ...subPaths);

export const clone = <T>(obj: T, cloned = new WeakMap<object, unknown>()): T => {
	if (obj === null || typeof obj !== "object") return obj;

	const objectRef = obj as object;
	if (cloned.has(objectRef)) return cloned.get(objectRef) as T;

	const clonedObj = (Array.isArray(obj) ? [] : {}) as Record<string, unknown>;
	cloned.set(objectRef, clonedObj);

	for (const key in obj as Record<string, unknown>) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			clonedObj[key] = clone((obj as Record<string, unknown>)[key], cloned);
		}
	}

	return clonedObj as T;
};

export const displayCommand = (command: ApplicationCommand) => {
	const entry = [];

	if (command.options && command.options.length > 0) {
		for (const option of command.options) {
			if (option.type === ApplicationCommandOptionType.Subcommand) {
				entry.push(`  - </${command.name} ${option.name}:${command.id}>: ${option.description}`);
			} else if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
				entry.push(`  - \`/${command.name} ${option.name}\``);

				const subGroup = option as { options?: ApplicationCommandOption[] };
				if (subGroup.options) {
					for (const subOption of subGroup.options) {
						if (subOption.type === ApplicationCommandOptionType.Subcommand) {
							entry.push(`    - </${command.name} ${option.name} ${subOption.name}:${command.id}>: ${subOption.description}`);
						}
					}
				}
			}
		}
	}

	if (entry.length > 0) entry.unshift(`- \`/${command.name}\``);
	else entry.unshift(`- </${command.name}:${command.id}>: ${command.description}`);

	return entry.join("\n");
};

export const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Combine paths, similar to {@link https://nodejs.org/api/path.html#pathjoinpaths Node.js path.join} method
 */
export const join = (...parts: string[]): string => parts.map((part, index) => {
	part = String(part);

	if (index === 0) return part.trim().replace(/[\/]*$/g, "");
	else return part.trim().replace(/^[\/]*|[\/]*$/g, "");
}).filter(Boolean).join("/");

export const parseCustomId = (customId: string): [string, ...string[]] => {
	const [baseId, ...options] = customId.split(":");
	return [baseId ?? "", ...options];
};

export const parseDuration = (input: string): number | null => {
	const durationRegex = /(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|h|days?|d|weeks?|w|months?|mo|years?|y)/gi;
	let milliseconds = 0;
	let found = false;

	let match;
	while ((match = durationRegex.exec(input)) !== null) {
		const value = parseInt(match[1]);
		const unit = match[2].toLowerCase();
		found = true;

		if (unit.startsWith("y")) milliseconds += value * 365 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("mo")) milliseconds += value * 30 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("w")) milliseconds += value * 7 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("d")) milliseconds += value * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("h")) milliseconds += value * 60 * 60 * 1000;
		else if (unit.startsWith("min") || unit === "m") milliseconds += value * 60 * 1000;
		else if (unit.startsWith("s")) milliseconds += value * 1000;
	}

	return found ? milliseconds : null;
};

export const safeStringify = (obj: unknown): string => {
	try {
		return JSON.stringify(obj, null, 2);
	} catch {
		return String(obj);
	}
};

export const sendChunks = async (text: string, f: (chunk: string) => Promise<unknown>): Promise<void> => {
	const maxLength = 2000;
	if (text.length <= maxLength) await f(text);
	else {
		const chunks: string[] = [];

		let currentChunk = "";
		const lines = text.split("\n");

		for (const line of lines) {
			if (currentChunk.length + line.length + 1 > maxLength) {
				if (currentChunk.length > 0) {
					chunks.push(currentChunk);
					currentChunk = "";
				}

				if (line.length > maxLength) {
					let remainingLine = line;
					while (remainingLine.length > maxLength) {
						chunks.push(remainingLine.slice(0, maxLength));
						remainingLine = remainingLine.slice(maxLength);
					}
					currentChunk = remainingLine;
				} else {
					currentChunk = line;
				}
			} else {
				currentChunk += (currentChunk.length > 0 ? "\n" : "") + line;
			}
		}

		if (currentChunk.length > 0) chunks.push(currentChunk);

		for (const chunk of chunks) await f(chunk);
	}
};

export class StopSignal extends Error {
	constructor() {
		super("StopSignal");
		this.name = "";
	};
};

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));