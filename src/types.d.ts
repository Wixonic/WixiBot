import { ActivitiesOptions, CustomStatus, RichPresence, SpotifyRPC } from "discord.js-selfbot-v13";

// Server
export interface ApplicationSettings {
	clientId: string;
	clientSecret: DiscordApplicationSecretsSettings["secret"];
	publicKey: string;
	token: DiscordApplicationSecretsSettings["token"];

	adminRole: string;
	defaultTextChannel: string;
	guildId: string;
	moderationChannel: string;
	ticketChannel: string;

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
		buttonChannel: string;
		category: string;
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
	ticket: (guildId: string, ticketId: string) => string;
	tickets: (guildId: string) => string;
};

export interface DiscordSecretsSettings {
	application: {
		secret: string;
		token: string;
	};
	client: {
		token: string;
	};
	webhook: string;
};

export interface KCMathsSecretsSettings {
	username: string;
	password: string;
};

export interface ModerationSecretsSettings {
	active: boolean;
	llm: string;
};

export interface PathsSecretsSettings {
	root: string;
};

export interface ServerSecretsSettings {
	cert: string;
	key: string;
};

export interface SecretsSettings {
	discord: DiscordSecretsSettings;
	kcmaths: KCMathsSecretsSettings;
	moderation: ModerationSecretsSettings;
	paths: PathsSecretsSettings;
	rpc: RPCSecretsSettings;
	server: ServerSecretsSettings;
	wixkey: string;
};

export interface WebsiteSettings {
	storage: string;
	server: string;
};

export interface MainSettings {
	active: boolean;
	port: number;
	application: ApplicationSettings;
	paths: PathsSettings;
	secrets: SecretsSettings;
	rpc: RPCSettings;
	website: WebsiteSettings;
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
	body?: any;
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
	run: (
		logger: import("@wixonic/logger").Logger,
		bot: import("./lib/bot.js"),
		server: import("./lib/server.js"),
		interaction: import("discord.js").CommandInteraction | import("discord.js").MessageContextMenuCommandInteraction | import("discord.js").UserContextMenuCommandInteraction
	) => Promise<void>;
};


export interface ComponentInfo {
	name: string;
	id: string;
	type: import("discord.js").ComponentType;
	run: (
		logger: import("@wixonic/logger").Logger,
		bot: import("./lib/bot.js"),
		interaction: import("discord.js").ButtonInteraction,
		...args: string[]
	) => Promise<void>;
};


export interface CronInfo {
	name: string;
	condition: (minutes: number, now: Date) => boolean;
	run: (
		logger: import("@wixonic/logger").Logger,
		bot: import("./lib/bot.js"),
		minutes: number,
		now: Date
	) => Promise<void>;
};


export interface ListenerInfo {
	name: string;
	event: string;
	run: (
		logger: import("@wixonic/logger").Logger,
		bot: import("./lib/bot.js"),
		server: import("./lib/server.js"),
		...any: any[]
	) => Promise<void>;
};


export interface ModalInfo {
	name: string;
	run: (
		logger: import("@wixonic/logger").Logger,
		bot: import("./lib/bot.js"),
		interaction: import("discord.js").ModalSubmitInteraction
	) => Promise<void>;
};


type HttpHandler = (
	logger: import("@wixonic/logger").Logger,
	settings: MainSettings,
	req: import("express").Request,
	res: import("express").Response,
	bot: import("./lib/bot.js"),
	rpc: import("./lib/rpc.js"),
	sdk: import("./lib/sdk.js")
) => Promise<void>;

type WSHandler = (
	logger: import("@wixonic/logger").Logger,
	settings: MainSettings,
	ws: import("ws").WebSocket,
	bot: import("./lib/bot.js"),
	rpc: import("./lib/rpc.js"),
	sdk: import("./lib/sdk.js")
) => Promise<void>;

type LoopHandler = (
	logger: import("@wixonic/logger").Logger,
	settings: MainSettings,
	bot: import("./lib/bot.js"),
	rpc: import("./lib/rpc.js"),
	sdk: import("./lib/sdk.js")
) => Promise<boolean>;

export interface HandlerInfo {
	path: string;
	handlers: {
		get: HttpHandler?;
		post: HttpHandler?;
		put: HttpHandler?;
		patch: HttpHandler?;
		delete: HttpHandler?;
		options: HttpHandler?;
		ws: WSHandler?;
	};
	loop: {
		delay: number;
		process: LoopHandler;
	}
};


export interface Gift {
	name: string;
	secret: string;
	note: string?;
};

export interface GiveawayData {
	gifts: Gift[];
	participants: string[];
	startsAt: number?;
	endsAt: number?;
	status: number;
	startsAt: string?;
};

// RPC
export type Activity = ActivitiesOptions | RichPresence | SpotifyRPC | CustomStatus;

export interface Song {
	state: "PLAYING" | "PAUSED" | "STOPPED";
	track: string;
	artist: string;
	album: string;
	startedAt?: number;
	pausedAt?: number;
	duration: number;
	spotifyArtwork?: string;
	spotifyArtworkURL?: string;
	spotifyArtistIconURL?: string;
	spotifyId?: string;
	color?: string;
	path?: string;
};

export interface RPCSettings {
	discord: {
		application: {
			clients: Record<string, {
				id: string;
				assets: Record<string, string>;
			}>;
		};

		token: string;
	};
	spotify: {
		id: string;
		secret: string;
	};
	status: {
		channel: string;
	};
};

export interface RPCSecretsSettings {
	discord: string;
	roblox: {
		id: string;
		token: string;
	};
	spotify: {
		id: string;
		secret: string;
	};
	steam: {
		id: string;
		token: string;
	};
};