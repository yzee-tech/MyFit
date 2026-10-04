/** "Name", else "Name (2)", "Name (3)"... whichever isn't taken yet */
export function uniqueRoutineName(wanted: string, taken: Iterable<string>): string {
	const takenNames = new Set(taken);
	let candidate = wanted;
	for (let n = 2; takenNames.has(candidate); n++) candidate = `${wanted} (${n})`;
	return candidate;
}
