import {
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ContainerBuilder,
	type ModalSubmitInteraction,
	type MessageComponentInteraction,
	PermissionFlagsBits,
	SeparatorSpacingSize
} from "discord.js";

import { client } from "../lib/client.ts";
import { guildSettingsSchema } from "../lib/guild.ts";
import { userSettingsSchema } from "../lib/user.ts";

interface BaseDynamicSetting<Type extends string> {
	description?: string;
	type: Type;
};

interface DynamicChildSetting<Type extends string> extends BaseDynamicSetting<Type> {
	key: string;
	name: string;
};

interface DynamicValueSetting<Type extends string, Value> extends DynamicChildSetting<Type> {
	default: Value;
};

export interface DynamicRootObjectSetting extends BaseDynamicSetting<"object"> {
	children: Record<string, DynamicSetting>;
};

export interface DynamicObjectSetting extends DynamicChildSetting<"object">, DynamicRootObjectSetting { }

export interface DynamicBooleanSetting extends DynamicValueSetting<"boolean", boolean> { };

export interface DynamicChannelSetting extends DynamicValueSetting<"channel", string | string[] | null> {
	channelTypes?: number[];
	multiple?: boolean;
};

export interface DynamicNumberSetting extends DynamicValueSetting<"number", number | null> {
	min?: number;
	max?: number;
};

export interface DynamicRoleSetting extends DynamicValueSetting<"role", string | null> { };

export interface DynamicStringSetting extends DynamicValueSetting<"string", string | null> { };

export interface DynamicUserSetting extends DynamicValueSetting<"user", string | null> { };

export interface DynamicSectionSetting extends DynamicValueSetting<"section", string | string[] | null> {
	multiple?: boolean;
};

export type DynamicSetting =
	DynamicObjectSetting |
	DynamicBooleanSetting |
	DynamicChannelSetting |
	DynamicNumberSetting |
	DynamicRoleSetting |
	DynamicStringSetting |
	DynamicUserSetting |
	DynamicSectionSetting;

export type DynamicSettingsSchema = DynamicRootObjectSetting;

export interface DynamicSettingsScopeContext {
	scopePath: "/User" | "/Guild";
	scopeName: "User" | "Guild";
	schemaRoot: DynamicRootObjectSetting;
	settingsRoot: Record<string, unknown>;
	save: () => Promise<void>;
};

export interface DynamicSettingsPathContext {
	breadcrumbParts: string[];
	schema: DynamicRootObjectSetting | DynamicSetting;
	currentSettings: Record<string, unknown> | undefined;
	parentSettings: Record<string, unknown> | undefined;
	targetSetting: DynamicSetting | null;
	targetKey: string | null;
};

const valueFormatters: Record<Exclude<DynamicSetting["type"], "object">, (value: unknown) => string> = {
	boolean: (value) => value ? "Enabled" : "Disabled",
	channel: (value) => {
		if (Array.isArray(value)) return value.length > 0 ? value.map(v => `<#${v}>`).join(", ") : "Not set";
		return typeof value === "string" && value.length > 0 ? `<#${value}>` : "Not set";
	},
	number: (value) => typeof value === "number" ? `\`${value}\`` : "Not set",
	role: (value) => {
		if (Array.isArray(value)) return value.length > 0 ? value.map(v => `<@&${v}>`).join(", ") : "Not set";
		return typeof value === "string" && value.length > 0 ? `<@&${value}>` : "Not set";
	},
	section: (value) => {
		if (Array.isArray(value)) return value.length > 0 ? value.map(v => `<#${v}>`).join(", ") : "Not set";
		return typeof value === "string" && value.length > 0 ? `<#${value}>` : "Not set";
	},
	string: (value) => typeof value === "string" && value.length > 0 ? `\`${value}\`` : "Not set",
	user: (value) => typeof value === "string" && value.length > 0 ? `<@${value}>` : "Not set"
};

const isSettingDefaultValue = (setting: DynamicSetting, value: unknown): boolean => {
	if (setting.type === "object") {
		const objectValue = value && typeof value === "object" ? value as Record<string, unknown> : undefined;

		return Object.values(setting.children).every((child) => isSettingDefaultValue(child, objectValue?.[child.key]));
	}

	const valueSetting = setting as DynamicValueSetting<string, unknown>;

	if (value === undefined) return true;

	return value === valueSetting.default;
};

export const resolveDynamicSettingsScopeContextFor = async (path: string, interaction: ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction): Promise<DynamicSettingsScopeContext | null> => {
	if (path.startsWith("/User")) {
		const user = await client.getUser(interaction.user.id);
		if (!user) return null;

		return {
			scopePath: "/User",
			scopeName: "User",
			schemaRoot: userSettingsSchema,
			settingsRoot: user.settings as unknown as Record<string, unknown>,
			save: user.saveSettings.bind(user)
		};
	}

	if (path.startsWith("/Guild") && interaction.guildId) {
		const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild, true);
		if (hasPermission === false) return null;

		const guild = await client.getGuild(interaction.guildId);
		if (!guild) return null;

		return {
			scopePath: "/Guild",
			scopeName: "Guild",
			schemaRoot: guildSettingsSchema,
			settingsRoot: guild.settings as unknown as Record<string, unknown>,
			save: guild.saveSettings.bind(guild)
		};
	}

	return null;
};

export const resolveDynamicSettingsPath = (scope: DynamicSettingsScopeContext, path: string): DynamicSettingsPathContext | null => {
	if (!path.startsWith(scope.scopePath)) return null;

	let schema: DynamicRootObjectSetting | DynamicSetting = scope.schemaRoot;
	const currentPath = path.replace(scope.scopePath, "").split("/").filter(Boolean);
	const breadcrumbParts = ["Settings", scope.scopeName];
	let currentSettings: Record<string, unknown> | undefined = scope.settingsRoot;
	let parentSettings: Record<string, unknown> | undefined;
	let targetSetting: DynamicSetting | null = null;
	let targetKey: string | null = null;

	for (const segment of currentPath) {
		if (schema.type !== "object") return null;

		const childSchema: DynamicSetting | undefined = schema.children[segment];
		if (!childSchema) return null;

		breadcrumbParts.push(childSchema.name);
		parentSettings = currentSettings;
		targetSetting = childSchema;
		targetKey = childSchema.key;
		schema = childSchema;

		if (childSchema.type === "object") {
			const nextSettings: unknown = currentSettings?.[childSchema.key];
			currentSettings = nextSettings && typeof nextSettings === "object" ? nextSettings as Record<string, unknown> : undefined;
		} else currentSettings = undefined;
	}

	return {
		breadcrumbParts,
		schema,
		currentSettings,
		parentSettings,
		targetSetting,
		targetKey
	};
};

const generateDynamicSettingsScopeComponentFor = (path: string, scope: DynamicSettingsScopeContext, backButton: ButtonBuilder): ContainerBuilder | null => {
	const pathContext = resolveDynamicSettingsPath(scope, path);
	if (!pathContext || pathContext.schema.type !== "object") return null;

	const { breadcrumbParts, currentSettings, schema } = pathContext;

	const formattedPath = breadcrumbParts.join(" > ");
	const container = new ContainerBuilder()
		.addTextDisplayComponents((component) => component
			.setContent(`# ${formattedPath}${schema.description ? `
	
${schema.description}` : ""}`))
		.addActionRowComponents((component) => component
			.addComponents([
				backButton
			])
		)
		.addSeparatorComponents((component) => component
			.setSpacing(SeparatorSpacingSize.Large)
		);

	const values = Object.values(schema.children);

	for (const [id, child] of values.entries()) {
		const childValue = currentSettings ? currentSettings[child.key] : undefined;
		const disableReset = isSettingDefaultValue(child, childValue);
		const currentValueText = child.type === "object" ? "" : (() => {
			const effectiveValue = childValue === undefined ? child.default : childValue;
			const formattedValue = valueFormatters[child.type](effectiveValue);
			const defaultSuffix = childValue === undefined ? " *(default)*" : "";

			return `\n\n**Current value:** ${formattedValue}${defaultSuffix}`;
		})();

		container
			.addTextDisplayComponents((component) => component
				.setContent(`## ${child.name}${child.description ? `
	
${child.description}` : ""}${currentValueText}`)
			);

		if (child.type === "object") container
			.addActionRowComponents((component) => component
				.addComponents([
					new ButtonBuilder()
						.setCustomId(`settings:path:${path}/${child.key}:view`)
						.setLabel("View")
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(`settings:path:${path}/${child.key}:reset`)
						.setLabel("Reset")
						.setStyle(ButtonStyle.Danger)
						.setDisabled(disableReset)
				])
			);
		else {
			container
				.addActionRowComponents((component) => component
					.addComponents([
						new ButtonBuilder()
							.setCustomId(`settings:path:${path}/${child.key}:edit`)
							.setLabel("Edit")
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`settings:path:${path}/${child.key}:reset`)
							.setLabel("Reset")
							.setStyle(ButtonStyle.Danger)
							.setDisabled(disableReset)
					])
				);
		}

		if (id !== values.length - 1) container.addSeparatorComponents((component) => component
			.setSpacing(SeparatorSpacingSize.Small)
		);
	}

	return container;
};

export const generateDynamicSettingsComponentFor = async (path: string, interaction: ChatInputCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction) => {
	const showGuildSettings = interaction.guild && interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild, true);

	const backPath = path.split("/").slice(0, -1).join("/");
	const backButton = new ButtonBuilder()
		.setCustomId(`settings:path:${backPath}:view`)
		.setLabel("Back")
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(path === "");

	const formattedPath = `Settings${path.split("/").join(" > ")}`;

	if (path === "") {
		return new ContainerBuilder()
			.addTextDisplayComponents((component) => component
				.setContent(`# ${formattedPath}

First, we need to choose what type of settings you want to modify.
Choose a category below.`))
			.addActionRowComponents((component) => component
				.addComponents([
					backButton,
					new ButtonBuilder()
						.setCustomId("settings:path:/User:view")
						.setLabel("User settings")
						.setStyle(ButtonStyle.Primary),
					...showGuildSettings ? [
						new ButtonBuilder()
							.setCustomId("settings:path:/Guild:view")
							.setLabel("Guild settings")
							.setStyle(ButtonStyle.Primary)
					] : []
				])
			);
	}

	const scope = await resolveDynamicSettingsScopeContextFor(path, interaction);
	if (scope && (scope.scopePath !== "/Guild" || showGuildSettings)) {
		const scopeContainer = generateDynamicSettingsScopeComponentFor(path, scope, backButton);

		if (scopeContainer) return scopeContainer;
	}

	return new ContainerBuilder()
		.addTextDisplayComponents((component) => component
			.setContent(`# ${formattedPath}

Oops! It seems like the settings you are trying to access doesn't exist!
Please click the button below to go back.`))
		.addActionRowComponents((component) => component
			.addComponents([
				backButton
			])
		);
};