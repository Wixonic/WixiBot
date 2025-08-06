export interface ApplicationSettings {
	clientId: string;
	clientSecret: DiscordApplicationSecretsSettings["secret"];
	publicKey: string;
	token: DiscordApplicationSecretsSettings["token"];

	adminRole: string;
	defaultTextChannel: string;
	guildId: string;
	moderationChannel: string;

	commands: CommandsSettings;
};

export interface CommandsSettings {
	giveaways: {
		channel: string;
		role: string;
	};
	privateChannels: {
		channels: {
			[id: string]: string
		}
	};
	ranks: {
		channel: string;
		ignored: string[];
		points: {
			messages: number;
			voice: number;
			stream: number;
		};
		eliteOfTheMonthRole: string;
		roles: { [id: string]: number };
	};
	roles: {
		channel: string;
		cosmeticMarkerRole: string;
		oldMarkerRole: string;
		mentionChannel: string;
		mentionRole: string;
	};
	rules: {
		channel: string;
	};
	tickets: {
		channel: string;
	};
};

export interface PathsSettings {
	cache: string;
	giveaway: (guildId: string, giveawayId: string) => string;
	giveaways: (guildId: string) => string;
	markdown: {
		help: string;
		privacy: string;
		rules: string;
		ticket: string;
	};
	leaderboard: (guildId: string) => string;
	privateChannel: (guildId: string, memberId: string) => string;
	recurrentRoles: (guildId: string) => string;
	rank: (guildId: string, memberId: string) => string;
	ranks: (guildId: string) => string;
	roles: string;
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
	url: string;
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
	eliteOfTheMonth: LeaderboardUser | null;
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
	name: string;
	deploy: import("discord.js").APIApplicationCommand;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), interaction: import("discord.js").CommandInteraction | import("discord.js").MessageContextMenuCommandInteraction | import("discord.js").UserContextMenuCommandInteraction) => Promise<void>;
};


export interface ComponentInfo {
	name: string;
	id: string;
	type: import("discord.js").ComponentType;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), interaction: import("discord.js").ButtonInteraction, ...args: string[]) => Promise<void>;
};


export interface CronInfo {
	name: string;
	condition: (minutes: number, now: Date) => boolean;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), minutes: number, now: Date) => Promise<void>;
};


export interface ListenerInfo {
	name: string;
	event: string;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), ...any: any[]) => Promise<void>;
};


export interface ModalInfo {
	name: string;
	run: (logger: import("@wixonic/logger").Logger, bot: import("./lib/bot.js"), minutes: number, now: Date) => Promise<void>;
};


type HttpHandler = (
	logger: import("@wixonic/logger").Logger,
	settings: MainSettings,
	req: Request,
	res: Response,
	bot: Bot
) => void;

type WSHandler = (
	logger: import("@wixonic/logger").Logger,
	settings: MainSettings,
	ws: import("ws").WebSocket
) => void;

export interface HandlerInfo {
	path: string;
	handlers: Record<string, HttpHandler> & {
		ws: WSHandler;
	};
};


export interface Gift {
	name: string;
	secret: string;
};

export interface GiveawayData {
	gifts: Gift[];
	participants: string[];
	startsAt: number?;
	endsAt: number?;
	status: number;
	startsAt: string?;
};