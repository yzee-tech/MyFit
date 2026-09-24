type ReleaseData = { body: string; published_at: string; tag_name: string };

export const load = async ({ fetch }) => {
	const response = await fetch('https://api.github.com/repos/yzee-tech/MyFit/releases');
	const body = await response.json();
	if (!Array.isArray(body)) return { releases: [] as ReleaseData[] };
	const releases = body.map(({ body, published_at, tag_name }: ReleaseData) => ({
		body,
		published_at,
		tag_name
	})) as ReleaseData[];
	return { releases };
};
