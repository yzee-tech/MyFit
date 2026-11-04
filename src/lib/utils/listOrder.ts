import { convertCamelCaseToNormal } from '../utils';

/**
 * The order of the pick lists: alphabetical, unless a list has an order of its own (set types, effort,
 * the gym's unit). Whatever a list is built from, sort it here so every list follows the same rule.
 */

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** A to Z by the words shown */
export function compareLabels(a: string, b: string): number {
	return collator.compare(a, b);
}

/** Muscle groups A to Z by the name shown; "Custom" (it opens a box to name it) goes last */
export function sortMuscleGroups<T extends string>(groups: readonly T[]): T[] {
	return [...groups].sort((a, b) => {
		if (a === b) return 0;
		if (a === 'Custom') return 1;
		if (b === 'Custom') return -1;
		return compareLabels(convertCamelCaseToNormal(a), convertCamelCaseToNormal(b));
	});
}

/** Muscle group section headings as shown (a custom group under its own name): A to Z */
export function sortGroupHeadings<T extends string>(headings: readonly T[]): T[] {
	return [...headings].sort((a, b) => compareLabels(a, b));
}

/** Blocks A to Z by name; blocks with the same name newest start first */
export function sortMesocycles<T extends { name: string; startDate: Date | string | null }>(
	mesocycles: readonly T[]
): T[] {
	const time = (date: Date | string | null) => (date ? new Date(date).getTime() : Number.POSITIVE_INFINITY);
	return [...mesocycles].sort((a, b) => compareLabels(a.name, b.name) || time(b.startDate) - time(a.startDate));
}

/** Block names A to Z, with the workouts outside any block (null) first */
export function sortBlockNames(names: readonly (string | null)[]): (string | null)[] {
	return [...names].sort((a, b) => {
		if (a === b) return 0;
		if (a === null) return -1;
		if (b === null) return 1;
		return compareLabels(a, b);
	});
}

/**
 * The routine names of a block's workouts. A running block follows the order of My routines (the first
 * routine of that name); names that aren't there any more (renamed or deleted since) come after, A to Z.
 * A finished block has no My routines to follow: A to Z.
 */
export function sortRoutineNames(names: readonly string[], myRoutineNames: readonly string[] | null): string[] {
	if (!myRoutineNames) return [...names].sort(compareLabels);
	const position = (name: string) => {
		const at = myRoutineNames.indexOf(name);
		return at === -1 ? Number.POSITIVE_INFINITY : at;
	};
	return [...names].sort((a, b) => position(a) - position(b) || compareLabels(a, b));
}
