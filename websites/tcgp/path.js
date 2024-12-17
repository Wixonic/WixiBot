const getIllustrationURL = (expansion = "A1", id = 0) => new URL(`/tcgp/illustration/${expansion}/${id}.jpeg`, location.host);
const getFallbackIllustrationURL = () => new URL(`/tcgp/illustration/fallback.jpeg`, location.host);

export {
	getIllustrationURL,
	getFallbackIllustrationURL
};