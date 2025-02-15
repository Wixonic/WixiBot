/**
 * @typedef {object} Logger
 * @property {(any: ...string) => void} debug
 * @property {(any: ...string) => void} info
 * @property {(any: ...string) => void} error
 * @property {(any: ...string) => void} warn
 * @property {(any: ...string) => Logger} basicIndent
 */


/**
 * Located in settings → _GUILD ID_ → application.js
 * @typedef {object} ApplicationSettings
 * @property {string} clientId
 * @property {SecretsDiscordClientSettings.secret} clientSecret
 * @property {string} publicKey
 * @property {SecretsDiscordClientSettings.token} token
 */


/**
 * Located in settings → _GUILD ID_ → paths.js
 * @typedef {object} PathsSettings
 * @property {URL} ollama
 */


/**
 * @typedef {object} SecretsDiscordApplicationSettings
 * @property {string} secret
 * @property {string} token
 */

/**
 * @typedef {object} SecretsDiscordClientSettings
 * @property {string} token
 */

/**
 * @typedef {object} SecretsDiscordSettings
 * @property {SecretsDiscordApplicationSettings} application
 * @property {SecretsDiscordClientSettings} client
 * @property {string} webhook
 */

/**
 * Located in settings → _GUILD ID_ → secrets.js
 * @typedef {object} SecretsSettings
 * @property {SecretsDiscordSettings} discord
 */


/**
 * Located in settings → _GUILD ID_ → main.js
 * @typedef {object} MainSettings
 * @property {boolean} active
 * @property {ApplicationSettings} application
 * @property {PathsSettings} paths
 * @property {SecretsSettings} secrets
 */


/**
 * @typedef {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"} RequestMethod
 */

/**
 * @typedef {"headers" | "json" | "raw" | "text"} RequestResponseType
 */

/**
 * @typedef {object} RequestOptions
 * @property {string?} auth
 * @property {object?} body
 * @property {import("http").OutgoingHttpHeaders?} headers
 * @property {RequestMethod?} method
 * @property {boolean?} secure
 * @property {RequestResponseType} type
 * @property {URL | string} url
 */


/**
 * @typedef {object} CommandOptions
 * @property {string} id
 * @property {string} name
 * @property {string} path
 */

/**
 * @typedef {object} CommandInfo
 * @property {import("discord.js").APIApplicationCommand} deploy
 * @property {string} name
 * @property {(bot: import("./bot.js").Bot, logger: Logger, ...any) => Promise<void>} run
 */


/**
 * @typedef {object} ListenerInfo
 * @property {string} id
 * @property {string} name
 * @property {(bot: import("./bot.js").Bot, logger: Logger, ...any) => Promise<void>} run
 */