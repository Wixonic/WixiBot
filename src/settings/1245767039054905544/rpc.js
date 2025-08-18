const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").RPCSettings}
 */
const rpcSettings = {
	discord: {
		application: {
			clients: {
				apple_music: {
					id: "1344995710352883752",
					assets: {
						icon: "1349432220976283739"
					}
				},
				blender: {
					id: "1344996879402008681",
					assets: {
						icon: "1349432785047130152",
						"Apple M4 Max": "1345009271431237744"
					}
				},
				chess: {
					id: "1348203873889681448",
					assets: {
						icon: "1348205397537984643"
					}
				},
				github: {
					id: "1349433570153992372",
					assets: {
						icon: "1349433570153992372"
					}
				},
				minecraft: {
					id: "1259643101614571643",
					assets: {
						icon: "1345001621960134757"
					}
				},
				roblox: {
					id: "1345002492160639089",
					assets: {
						icon: "1345002655847682099",
						studio_icon: "1345002655054958673"
					}
				},
				steam: {
					id: "1345002860416598027",
					assets: {
						icon: "1345003018483142656"
					}
				},
				vsc: {
					id: "1345007945997619290",
					assets: {
						icon: "1349436472964415518"
					}
				},
				war_thunder: {
					id: "1345003196581675019",
					assets: {
						icon: "1345003314856726559"
					}
				},
				youtube: {
					id: "1345003715819733002",
					assets: {
						icon: "1349435891415777380"
					}
				}
			}
		},
		token: secrets.rpc.discord
	},
	rejectUnauthorized: true,
	roblox: {
		id: secrets.rpc.roblox.id,
		token: secrets.rpc.roblox.token
	},
	server: {
		port: 1000
	},
	spotify: {
		id: secrets.rpc.spotify.id,
		secret: secrets.rpc.spotify.secret,
	},
	status: {
		channel: "1405562261187072190"
	},
	steam: {
		id: secrets.rpc.steam.id,
		token: secrets.rpc.steam.token
	}
};

module.exports = rpcSettings;