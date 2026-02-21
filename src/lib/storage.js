const fs = require("fs");
const path = require("path");

const getStorage = (settings) => {
	const storagePath = path.join(settings.secrets.paths.root, "storage");
	if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

	const dbPath = path.join(storagePath, "db.json");
	if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

	const read = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
	const write = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, "\t"));

	return { storagePath, dbPath, read, write };
};

module.exports = { getStorage };