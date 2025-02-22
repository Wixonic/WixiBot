/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
const wait = (milliseconds) => new Promise((resolve) => setTimeout(() => resolve(), milliseconds));

module.exports = {
	wait
};