/** "Name", else "Name (2)", "Name (3)"... whichever isn't taken yet */
export function uniqueRoutineName(wanted: string, taken: Iterable<string>): string {
	const takenNames = new Set(taken);
	let candidate = wanted;
	for (let n = 2; takenNames.has(candidate); n++) candidate = `${wanted} (${n})`;
	return candidate;
}

/**
 * Items whose names are all different: a repeat of a name gets "(2)", "(3)"... (whichever isn't taken by
 * an item of the list, before or after it). Items keep their order; an unchanged list comes back as is
 */
export function withUniqueNames<T extends { name: string }>(items: readonly T[]): T[] {
	const names = items.map((item) => item.name);
	const taken = new Set(names);
	const seen = new Set<string>();
	return items.map((item) => {
		if (!seen.has(item.name)) {
			seen.add(item.name);
			return item;
		}
		const name = uniqueRoutineName(item.name, taken);
		taken.add(name);
		seen.add(name);
		return { ...item, name };
	});
}
