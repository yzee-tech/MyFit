/**
 * A routine decides how many sets each exercise gets. Routines saved before every
 * exercise had a set count can have none: that means the usual 3, everywhere it's read.
 */
export const DEFAULT_SETS = 3;

export function routineSetCount(sets: number | null | undefined): number {
	return typeof sets === 'number' && sets > 0 ? sets : DEFAULT_SETS;
}
