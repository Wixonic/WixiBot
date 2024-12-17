/**
 * @typedef {Object} Booster
 * @property {string} name
 * @property {number[][]} odds
 * @property {number} type
 * @property {number} rarity
 */

/**
 * @typedef {Object} Pokémon
 * @property {string} name
 * @property {number[]} boosters
 * @property {number} type
 * @property {number} rarity
 */

/**
 * @typedef {Object} Expansion
 * @property {Booster[]} boosters
 * @property {Pokémon[]} pokémons
 */

/**
 * @typedef {Object} Rarity
 * @property {string} name
 */

/**
 * @typedef {Object} Type
 * @property {string} name
 */

/**
 * @typedef {Object} Data
 * @property {Expansion[]} expansions
 * @property {Rarity[]} rarities
 * @property {Type[]} types
 */

/**
 * @typedef {Object} DroppedBooster
 * @property {number} expansion
 * @property {number} booster
 * @property {number[]} drops
 */

/**
 * @typedef {Object} Opening
 * @property {number} timestamp
 * @property {DroppedBooster[]} boosters
 */

/**
 * @typedef {Object} User
 * @property {Opening[]} openings
 */