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
	cache: string;
	rank: (guildId: string) => string
};

export interface DiscordApplicationSecretsSettings {
	secret: string;
	token: string;
};

export interface DiscordClientSecretsSettings {
	token: string;
};

export interface DiscordSecretsSettings {
	application: DiscordApplicationSecretsSettings;
	client: DiscordClientSecretsSettings;
	webhook: string;
}

export interface PathsSecretsSettings {
	root: string;
};

export interface ServerSecretsSettings {
	cert: string;
	key: string;
};

export interface SecretsSettings {
	discord: DiscordSecretsSettings;
	paths: PathsSecretsSettings;
	server: ServerSecretsSettings;
	wixkey: string;
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
	run: (bot: import("./lib/bot.js"), logger: import("@wixonic/logger").Logger, ...any: any[]) => Promise<void>;
};


export interface ListenerInfo {
	id: string;
	name: string;
	run: (bot: import("./lib/bot.js"), logger: import("@wixonic/logger").Logger, ...any: any[]) => Promise<void>;
};


export interface HandlerInfo {
	path: string;
	handlers: Record<string, (logger: import("@wixonic/logger").Logger, settings: MainSettings, req: Express.Request, res: Express.Response) => void>
};