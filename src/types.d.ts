export interface ApplicationSettings {
	clientId: string;
	clientSecret: SecretsDiscordClientSettings["secret"];
	publicKey: string;
	token: SecretsDiscordClientSettings["token"];
	commands: CommandsSettings;
};

export interface CommandsSettings {
	rank: {
		roles: {
			string: number;
		};
	};
	ticket: {
		channel: string;
	};
	rules: {
		channel: string;
	};
};

export interface PathsSettings {
	rank: (guildId: string) => string
};

export interface SecretsDiscordApplicationSettings {
	secret: string;
	token: string;
};

export interface SecretsDiscordClientSettings {
	token: string;
};

export interface SecretsDiscordSettings {
	application: SecretsDiscordApplicationSettings;
	client: SecretsDiscordClientSettings;
	webhook: string;
}

export interface ServerSecretsSettings {
	cert: string;
	key: string;
};

export interface SecretsSettings {
	discord: SecretsDiscordSettings;
	server: ServerSecretsSettings;
};

export interface MainSettings {
	active: boolean;
	port: number;
	application: ApplicationSettings;
	paths: PathsSettings;
	secrets: SecretsSettings;
};


export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
export type RequestResponseType = "headers" | "json" | "raw" | "text";

export interface RequestOptions {
	auth?: string;
	body?: object;
	headers?: import("http").OutgoingHttpHeaders;
	method?: RequestMethod;
	secure?: boolean;
	type: RequestResponseType;
	url: URL | string;
};


export interface CommandOptions {
	id: string;
	name: string;
	path: string;
};


export interface CommandInfo {
	deploy: import("discord.js").APIApplicationCommand;
	name: string;
	run: (bot: import("./lib/bot.js"), logger: Logger, ...any: any[]) => Promise<void>;
};


export interface ListenerInfo {
	id: string;
	name: string;
	run: (bot: import("./lib/bot.js"), logger: Logger, ...any: any[]) => Promise<void>;
};