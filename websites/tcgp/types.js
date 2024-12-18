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
 * @property {string} name
 * @property {Booster[]} boosters
 * @property {Pokémon[]} pokémons
 */

/**
 * @typedef {Object} Rarity
 * @property {string} name
 */

/**
 * @typedef {Object} RarityType 
 * @property {Rarity[]} boosters
 * @property {Rarity[]} cards
 */

/**
 * @typedef {Object} Type
 * @property {string} name
 */

/**
 * @typedef {Object} Data
 * @property {Expansion[]} expansions
 * @property {RarityType} rarities
 * @property {Type[]} types
 */

/**
 * @typedef {Object} DroppedBooster
 * @property {number[]} drops
 */

/**
 * @typedef {Object} Opening
 * @property {number} type
 * @property {number?} timestamp
 * @property {number} expansion
 * @property {number?} booster
 * @property {DroppedBooster[]?} boosters
 * @property {number[]?} cards
 */

/**
 * @typedef {Object} User
 * @property {number}
 * @property {Opening[]} openings
 */