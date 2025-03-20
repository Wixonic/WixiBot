export interface ApplicationSettings {
	clientId: string;
	clientSecret: DiscordApplicationSecretsSettings["secret"];
	publicKey: string;
	token: DiscordApplicationSecretsSettings["token"];

	adminRole: string;
	defaultTextChannel: string;
	guildId: string;

	commands: CommandsSettings;
};

export interface CommandsSettings {
	rank: {
		channel: string;
		ignored: string[];
		points: {
			messages: number;
			voice: number;
			stream: number;
		};
		firstOfTheMonthRole: string;
		roles: { [id: string]: number };
	};
	roles: {
		channel: string;
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
	markdown: {
		help: string;
		privacy: string;
		rules: string;
		ticket: string;
	};
	leaderboard: (guildId: string) => string;
	rank: (guildId: string) => string;
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


export interface LeaderboardUser {
	id: string;
	points: number;
};

export interface Leaderboard {
	global: LeaderboardUser[];
	month: LeaderboardUser[];
	updatedAt: number;
	firstOfTheMonth: LeaderboardUser | null;
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
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), ...any: any[]) => Promise<void>;
};


export interface ListenerInfo {
	id: string;
	name: string;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), ...any: any[]) => Promise<void>;
};


export interface HandlerInfo {
	path: string;
	handlers: Record<string, (logger: import("@wixonic/logger").Logger, settings: MainSettings, req: Express.Request, res: Express.Response) => void>
};


export interface CronInfo {
	name: string;
	condition: (minutes: number, now: Date) => boolean;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), minutes: number, now: Date) => Promise<void>;
};