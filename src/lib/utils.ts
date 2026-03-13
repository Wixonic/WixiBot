import { type ApplicationCommand, type ApplicationCommandOption, ApplicationCommandOptionType } from "discord.js";

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

export const chunkMessage = (text: string, maxLength = 2000): string[] => {
	if (text.length <= maxLength) return [text];
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
	return chunks;
};

export class StopSignal extends Error {
	constructor() {
		super("StopSignal");
		this.name = "";
	}
};

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const parseDuration = (input: string): number | null => {
	const durationRegex = /(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|h|days?|d|weeks?|w|months?|mo|years?|y)/gi;
	let totalMs = 0;
	let found = false;

	let match;
	while ((match = durationRegex.exec(input)) !== null) {
		const value = parseInt(match[1]);
		const unit = match[2].toLowerCase();
		found = true;

		if (unit.startsWith("y")) totalMs += value * 365 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("mo")) totalMs += value * 30 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("w")) totalMs += value * 7 * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("d")) totalMs += value * 24 * 60 * 60 * 1000;
		else if (unit.startsWith("h")) totalMs += value * 60 * 60 * 1000;
		else if (unit.startsWith("min") || unit === "m") totalMs += value * 60 * 1000;
		else if (unit.startsWith("s")) totalMs += value * 1000;
	}

	return found ? totalMs : null;
};