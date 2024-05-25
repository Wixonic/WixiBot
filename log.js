module.exports = (any) => {
	const now = new Date();
	console.log(`[${now.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString(undefined, { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}] ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`);
};