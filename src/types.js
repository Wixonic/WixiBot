/**
 * Located in settings → _GUILD ID_ → application.js
 * @typedef {object} ApplicationSettings
 * @property {string} clientId
 * @property {SecretsDiscordClientSettings.secret} clientSecret
 * @property {string} publicKey
 * @property {SecretsDiscordClientSettings.token} token
 */


/**
 * @typedef {object} SecretsDiscordClientSettings
 * @property {string} secret
 * @property {string} token
 */

/**
 * @typedef {object} SecretsDiscordSettings
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
 * @property {SecretsSettings} secrets
 */