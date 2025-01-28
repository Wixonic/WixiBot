/**
 * @typedef {{name: string, from: string, to: string, color: string, id: string?}} ReccurentRole
 */

/**
 * @typedef {ReccurentRole[]} RecurrentRolesList
 */

/**
 * @typedef {"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"} RequestMethod
 */

/**
 * @typedef {"headers" | "json" | "raw" | "text"} RequestResponseType
 */

/**
 * @typedef {Object} RequestOptions
 * @property {String?} auth
 * @property {Object?} body
 * @property {import("http").OutgoingHttpHeaders?} headers
 * @property {RequestMethod?} method
 * @property {boolean?} secure
 * @property {RequestResponseType} type
 * @property {URL | String} url
 */

/**
 * @typedef {(options: RequestOptions) => Promise<any>} Request
 */

/**
 * @typedef {Object} Song
 * @property {"PLAYING" | "PAUSED" | "STOPPED"} state
 * @property {string} track
 * @property {string} artist
 * @property {string} album
 * @property {number?} startedAt
 * @property {number?} pausedAt
 * @property {number} duration
 * @property {string?} spotifyArtwork
 * @property {string?} spotifyArtworkURL
 * @property {string?} spotifyArtistIconURL
 * @property {string?} spotifyId
 * @property {string?} youtubeId
 * @property {string?} color
 * @property {string?} path
 */

module.exports = {};