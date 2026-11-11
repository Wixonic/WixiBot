import { MessageFlags } from "discord.js";

import { ensureParentSettingsFor, generateDynamicSettingsComponentFor } from "../lib/dynamicSettings.ts";
import type { Modal } from "../lib/client.ts";

const getParentPath = (path: string): string => path.split("/").slice(0, -1).join("/");

export const modal = {
	customId: "settings",
	async execute(_logger, interaction, ...options) {
		switch (options[0]) {
			case "value": {
				const type = options[1];
				const targetPath = options[2] ?? "";
				if (type !== "string" && type !== "number") throw new Error("Unsupported settings modal type");

				const resolved = await ensureParentSettingsFor(targetPath, interaction);
				if (!resolved) throw new Error("Could not resolve setting parent");

				const targetSetting = resolved.context.targetSetting;
				if (!targetSetting || targetSetting.type !== type) throw new Error("Setting type mismatch");

				const rawValue = interaction.fields.getTextInputValue("value").trim();
				let parsedValue: string | number = rawValue;

				if (type === "number") {
					parsedValue = Number(rawValue);
					if (!Number.isFinite(parsedValue)) {
						await interaction.reply({
							content: "Please enter a valid number.",
							flags: MessageFlags.Ephemeral
						});
						return;
					}

					const numberSetting = targetSetting;
					if (numberSetting.type === "number") {
						if (numberSetting.min !== undefined && parsedValue < numberSetting.min) {
							await interaction.reply({
								content: `Value must be greater than or equal to ${numberSetting.min}.`,
								flags: MessageFlags.Ephemeral
							});
							return;
						}

						if (numberSetting.max !== undefined && parsedValue > numberSetting.max) {
							await interaction.reply({
								content: `Value must be less than or equal to ${numberSetting.max}.`,
								flags: MessageFlags.Ephemeral
							});
							return;
						}
					}
				}

				resolved.parentSettings[resolved.context.targetKey!] = parsedValue;
				await resolved.scope.save();

				await interaction.reply({
					components: [
						await generateDynamicSettingsComponentFor(getParentPath(targetPath), interaction)
					],
					flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
				});
				break;
			}

			default: {
				throw new Error("Unknown settings modal type");
			}
		}
	}
} satisfies Modal;