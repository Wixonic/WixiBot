import {
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ContainerBuilder,
	MessageFlags,
	type MessageComponentInteraction,
	ModalBuilder,
	RoleSelectMenuBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder
} from "discord.js";

import {
	generateDynamicSettingsComponentFor,
	resolveDynamicSettingsPath,
	resolveDynamicSettingsScopeContextFor,
	type DynamicChannelSetting,
	type DynamicSetting
} from "../lib/dynamicSettings.ts";
import type { Component } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

const getParentPath = (path: string): string => path.split("/").slice(0, -1).join("/");

const normalizeSettingsPath = (path: string): string => {
	const withoutTrailingSlash = path.length > 1 ? path.replace(/\/+$/, "") : path;
	if (withoutTrailingSlash.startsWith("/guild")) return withoutTrailingSlash.replace(/^\/guild/, "/Guild");
	if (withoutTrailingSlash.startsWith("/user")) return withoutTrailingSlash.replace(/^\/user/, "/User");

	return withoutTrailingSlash;
};

const ensureParentSettings = async (path: string, setting: DynamicSetting, interaction: MessageComponentInteraction) => {
	const scope = await resolveDynamicSettingsScopeContextFor(path, interaction);
	if (!scope) return null;

	const context = resolveDynamicSettingsPath(scope, path);
	if (!context || !context.targetKey || context.targetSetting !== setting) return null;
	if (context.parentSettings) return {
		scope,
		context,
		parentSettings: context.parentSettings
	};

	const segments = path.replace(scope.scopePath, "").split("/").filter(Boolean);
	const parentSegments = segments.slice(0, -1);
	let schema = scope.schemaRoot as DynamicSetting | typeof scope.schemaRoot;
	let cursor = scope.settingsRoot;

	for (const segment of parentSegments) {
		if (schema.type !== "object") return null;
		const child = schema.children[segment];
		if (!child || child.type !== "object") return null;

		const next = cursor[child.key];
		if (!next || typeof next !== "object") cursor[child.key] = {};

		cursor = cursor[child.key] as Record<string, unknown>;
		schema = child;
	}

	return {
		scope,
		context,
		parentSettings: cursor
	};
};

export const component = {
	customId: "settings",
	async execute(_logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) {
		switch (options[0]) {
			case "path": {
				const targetPath = normalizeSettingsPath(options[1] ?? "");
				const action = options[2];

				switch (options[2]) {
					case "view": {
						await interaction.update({
							components: [
								await generateDynamicSettingsComponentFor(targetPath, interaction)
							],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
						break;
					}

					case "reset": {
						const scope = await resolveDynamicSettingsScopeContextFor(targetPath, interaction);
						if (!scope) throw new Error("Settings scope is invalid");

						const context = resolveDynamicSettingsPath(scope, targetPath);
						if (!context || !context.targetSetting || !context.targetKey) {
							await interaction.update({
								components: [
									await generateDynamicSettingsComponentFor(getParentPath(targetPath), interaction)
								],
								flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
							});
							break;
						}

						const parentPath = getParentPath(targetPath);
						if (context.parentSettings) {
							if (context.targetSetting.type === "object") delete context.parentSettings[context.targetKey];
							else context.parentSettings[context.targetKey] = context.targetSetting.default;
						}

						await scope.save();

						await interaction.update({
							components: [
								await generateDynamicSettingsComponentFor(parentPath, interaction)
							],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
						break;
					}

					case "edit": {
						const scope = await resolveDynamicSettingsScopeContextFor(targetPath, interaction);
						if (!scope) throw new Error("Settings scope is invalid");

						const context = resolveDynamicSettingsPath(scope, targetPath);
						if (!context || !context.targetSetting || !context.targetKey) {
							await interaction.update({
								components: [
									await generateDynamicSettingsComponentFor(getParentPath(targetPath), interaction)
								],
								flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
							});
							break;
						}

						const targetSetting = context.targetSetting;
						if (targetSetting.type === "object") throw new Error("Object settings cannot be edited directly");

						const parentPath = getParentPath(targetPath);
						const backButton = new ButtonBuilder()
							.setCustomId(`settings:path:${parentPath}:view`)
							.setLabel("Back")
							.setStyle(ButtonStyle.Secondary);

						const container = new ContainerBuilder()
							.addTextDisplayComponents((component) => component
								.setContent(`# Edit ${targetSetting.name}${targetSetting.description ? `\n\n${targetSetting.description}` : ""}`)
							)
							.addSeparatorComponents((component) => component
								.setSpacing(SeparatorSpacingSize.Small)
							);

						switch (targetSetting.type) {
							case "boolean": {
								container.addActionRowComponents((component) => component
									.addComponents([
										new StringSelectMenuBuilder()
											.setCustomId(`settings:edit:set:boolean:${targetPath}`)
											.setPlaceholder("Choose a value")
											.addOptions([
												new StringSelectMenuOptionBuilder().setLabel("Enabled").setValue("true"),
												new StringSelectMenuOptionBuilder().setLabel("Disabled").setValue("false")
											])
									])
								);
								break;
							}

							case "channel": {
								const DEFAULT_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
								const channelSetting = targetSetting as DynamicChannelSetting;
								const channelTypes = channelSetting.channelTypes ?? DEFAULT_CHANNEL_TYPES;

								container.addActionRowComponents((component) => component
									.addComponents([
										new ChannelSelectMenuBuilder()
											.setCustomId(`settings:edit:set:channel:${targetPath}`)
											.setPlaceholder("Select a channel")
											.setChannelTypes(...channelTypes)
											.setMinValues(1)
											.setMaxValues(channelSetting.multiple ? 25 : 1)
									])
								);
								break;


							}

							case "section": {
								container.addActionRowComponents((component) => component
									.addComponents([
										new ChannelSelectMenuBuilder()
											.setCustomId(`settings:edit:set:section:${targetPath}`)
											.setPlaceholder("Select a category")
											.setChannelTypes(ChannelType.GuildCategory)
											.setMinValues(1)
											.setMaxValues((targetSetting as any).multiple ? 25 : 1)
									])
								);
								break;
							}
							case "role": {
								container.addActionRowComponents((component) => component
									.addComponents([
										new RoleSelectMenuBuilder()
											.setCustomId(`settings:edit:set:role:${targetPath}`)
											.setPlaceholder("Select a role")
											.setMinValues(1)
											.setMaxValues(1)
									])
								);
								break;
							}

							case "user": {
								container.addActionRowComponents((component) => component
									.addComponents([
										new UserSelectMenuBuilder()
											.setCustomId(`settings:edit:set:user:${targetPath}`)
											.setPlaceholder("Select a user")
											.setMinValues(1)
											.setMaxValues(1)
									])
								);
								break;
							}

							case "number":
							case "string": {
								container.addActionRowComponents((component) => component
									.addComponents([
										new ButtonBuilder()
											.setCustomId(`settings:edit:modal:${targetSetting.type}:${targetPath}`)
											.setLabel("Set value")
											.setStyle(ButtonStyle.Primary),
										new ButtonBuilder()
											.setCustomId(`settings:edit:default:${targetPath}`)
											.setLabel("Set default")
											.setStyle(ButtonStyle.Secondary)
									])
								);
								break;
							}
						}

						container.addActionRowComponents((component) => component
							.addComponents([
								backButton
							])
						);

						await interaction.update({
							components: [container],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
						break;
					}

					default: {
						throw new Error(`Unknown settings action: ${action}`);
					}
				}
				break;
			}

			case "edit": {
				switch (options[1]) {
					case "set": {
						const type = options[2] as DynamicSetting["type"];
						const targetPath = normalizeSettingsPath(options[3] ?? "");

						const scope = await resolveDynamicSettingsScopeContextFor(targetPath, interaction);
						if (!scope) throw new Error("Settings scope is invalid");

						const context = resolveDynamicSettingsPath(scope, targetPath);
						if (!context || !context.targetSetting || !context.targetKey || context.targetSetting.type !== type) throw new Error("Setting path is invalid");

						const parentResolved = await ensureParentSettings(targetPath, context.targetSetting, interaction);
						if (!parentResolved) throw new Error("Could not resolve parent settings");

						let value: unknown;
						if (type === "boolean") {
							if (!interaction.isStringSelectMenu()) throw new Error("Expected string select menu");
							value = interaction.values[0] === "true";
						} else if (type === "channel") {
							if (!interaction.isChannelSelectMenu()) throw new Error("Expected channel select menu");
							const isMultiple = (context.targetSetting as any).multiple;
							value = isMultiple ? interaction.values : (interaction.values[0] ?? null);
						} else if (type === "role") {
							if (!interaction.isRoleSelectMenu()) throw new Error("Expected role select menu");
							const isMultiple = (context.targetSetting as any).multiple;
							value = isMultiple ? interaction.values : (interaction.values[0] ?? null);
						} else if (type === "user") {
							if (!interaction.isUserSelectMenu()) throw new Error("Expected user select menu");
							const isMultiple = (context.targetSetting as any).multiple;
							value = isMultiple ? interaction.values : (interaction.values[0] ?? null);

						} else if (type === "section") {
							if (!interaction.isChannelSelectMenu()) throw new Error("Expected channel select menu");
							const isMultiple = (context.targetSetting as any).multiple;
							value = isMultiple ? interaction.values : (interaction.values[0] ?? null);
						} else throw new Error("Unsupported direct set type");
						parentResolved.parentSettings[parentResolved.context.targetKey!] = value;
						await parentResolved.scope.save();

						await interaction.update({
							components: [
								await generateDynamicSettingsComponentFor(getParentPath(targetPath), interaction)
							],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
						break;
					}

					case "default": {
						const targetPath = normalizeSettingsPath(options[2] ?? "");
						const scope = await resolveDynamicSettingsScopeContextFor(targetPath, interaction);
						if (!scope) throw new Error("Settings scope is invalid");

						const context = resolveDynamicSettingsPath(scope, targetPath);
						if (!context || !context.targetSetting || !context.targetKey || context.targetSetting.type === "object") throw new Error("Setting path is invalid");

						const parentResolved = await ensureParentSettings(targetPath, context.targetSetting, interaction);
						if (!parentResolved) throw new Error("Could not resolve parent settings");

						parentResolved.parentSettings[parentResolved.context.targetKey!] = context.targetSetting.default;
						await parentResolved.scope.save();

						await interaction.update({
							components: [
								await generateDynamicSettingsComponentFor(getParentPath(targetPath), interaction)
							],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
						break;
					}

					case "modal": {
						if (!interaction.isButton()) throw new Error("Expected button interaction");

						const type = options[2];
						const targetPath = normalizeSettingsPath(options[3] ?? "");
						if (type !== "string" && type !== "number") throw new Error("Unsupported modal type");

						const modal = new ModalBuilder()
							.setCustomId(`settings:value:${type}:${targetPath}`)
							.setTitle(`Set ${type} value`)
							.addLabelComponents((component) => component
								.setLabel("Value")
								.setDescription(type === "number" ? "Enter a number" : "Enter text")
								.setTextInputComponent(
									new TextInputBuilder()
										.setCustomId("value")
										.setStyle(TextInputStyle.Short)
										.setRequired(true)
								)
							);

						await interaction.showModal(modal);
						break;
					}

					default: {
						throw new Error("Unknown settings edit action");
					}
				}

				break;
			}


			default: {
				throw new Error("Unknown settings action");
			}
		}
	}
} satisfies Component;
