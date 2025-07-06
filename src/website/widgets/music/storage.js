export default window.localStorage || window.sessionStorage || {
	getItem: () => null,
	setItem: () => null,
	removeItem: () => null,
	clear: () => null,
	key: () => null,
	length: 0
};