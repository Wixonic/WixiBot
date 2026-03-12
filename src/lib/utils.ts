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