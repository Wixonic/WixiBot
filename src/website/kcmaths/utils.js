const formatRank = (rank) => {
	if (rank <= 0) return "--";
	else if (rank == 1) return "1er";
	else return rank + "e";
};

const findRankFor = (leaderboard, id) => {
	let previousEntry = { id: 0, value: 0 };

	if (Object.keys(leaderboard).indexOf(id) == -1) return -1;
	if (id.endsWith("Corbineau")) return 0;

	let currentId = 0;
	for (const name in leaderboard) {
		++currentId;
		if (previousEntry.value != leaderboard[name]) previousEntry = { id: currentId, value: leaderboard[name] };
		if (name == id) break;
	}

	return previousEntry.id;
};

export {
	findRankFor,
	formatRank
};