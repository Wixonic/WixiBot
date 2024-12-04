const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const config = require("../config.js");

const app = initializeApp({
	credential: cert(config.firebase)
});

const db = getFirestore();

module.exports = {
	app,
	db
};