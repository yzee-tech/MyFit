/**
 * How an exercise's sets count towards muscles and body areas. Its muscle group counts a full set; each
 * muscle it also works (two at most) half a set. A Whole body exercise is its own line with its full
 * sets, and half a set towards each body area. One place for these rules: the Stats page, a block's
 * stats and the charts all count through here.
 */
import type { MuscleGroup } from './prismaEnums';

/** The six areas of the radar, in the order drawn (clockwise from the top left) */
export const BODY_AREAS = ['Back', 'Chest', 'Core', 'Shoulders', 'Arms', 'Legs'] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

const AREA_OF: Record<Exclude<MuscleGroup, 'Custom' | 'Cardio' | 'WholeBody'>, BodyArea> = {
	Chest: 'Chest',
	Lats: 'Back',
	Traps: 'Back',
	Neck: 'Back',
	FrontDelts: 'Shoulders',
	SideDelts: 'Shoulders',
	RearDelts: 'Shoulders',
	Biceps: 'Arms',
	Triceps: 'Arms',
	Forearms: 'Arms',
	Quads: 'Legs',
	Hamstrings: 'Legs',
	Glutes: 'Legs',
	Calves: 'Legs',
	Adductors: 'Legs',
	Abductors: 'Legs',
	Abs: 'Core'
};

/** Muscle groups that are no one muscle: never a secondary, and with no secondaries of their own (Custom may have them) */
const NOT_A_MUSCLE: readonly MuscleGroup[] = ['Cardio', 'Custom', 'WholeBody'];

/**
 * A muscle group's area; custom ones have none ("Other"), cardio isn't a muscle, and whole body is
 * every area (see muscleShares)
 */
export function bodyAreaOf(muscleGroup: MuscleGroup): BodyArea | null {
	return NOT_A_MUSCLE.includes(muscleGroup) ? null : AREA_OF[muscleGroup as keyof typeof AREA_OF];
}

/** An exercise also works this many muscles at most */
export const MAX_SECONDARY_MUSCLES = 2;
/** What a set counts towards a muscle the exercise also works */
export const SECONDARY_SHARE = 0.5;
/** What a Whole body set counts towards each body area */
export const WHOLE_BODY_AREA_SHARE = 0.5;

/** Whether an exercise with this muscle group can also work others: not cardio, not whole body */
export function canHaveSecondaryMuscles(primary: MuscleGroup | null | undefined): boolean {
	return primary !== 'Cardio' && primary !== 'WholeBody';
}

/** Whether a muscle group can be picked as one an exercise also works */
export function canBeSecondaryMuscle(muscleGroup: MuscleGroup, primary: MuscleGroup | null | undefined): boolean {
	return !NOT_A_MUSCLE.includes(muscleGroup) && muscleGroup !== primary;
}

/** What is wrong with an exercise's secondary muscles, or null */
export function secondaryMusclesProblem(
	primary: MuscleGroup,
	secondaries: readonly MuscleGroup[] | null | undefined
): string | null {
	const list = secondaries ?? [];
	if (list.length === 0) return null;
	if (!canHaveSecondaryMuscles(primary)) {
		return primary === 'Cardio'
			? 'A cardio exercise has no other muscles'
			: 'A whole body exercise already counts for every area';
	}
	if (list.length > MAX_SECONDARY_MUSCLES)
		return `An exercise has ${MAX_SECONDARY_MUSCLES} secondary muscle groups at most`;
	if (new Set(list).size !== list.length) return 'A muscle is listed twice';
	if (list.includes(primary)) return 'The primary muscle group can’t also be a secondary one';
	if (list.some((muscle) => NOT_A_MUSCLE.includes(muscle))) return 'Only single muscles can be added';
	return null;
}

/**
 * Secondary muscles that still hold for a muscle group: none for cardio or whole body, never the
 * muscle group itself. For a muscle group changed without saying anything about the others (an older
 * app version)
 */
export function secondaryMusclesFor(
	primary: MuscleGroup,
	secondaries: readonly MuscleGroup[] | null | undefined
): MuscleGroup[] {
	if (!canHaveSecondaryMuscles(primary)) return [];
	const kept = (secondaries ?? []).filter((muscle) => canBeSecondaryMuscle(muscle, primary));
	return [...new Set(kept)].slice(0, MAX_SECONDARY_MUSCLES);
}

export type ExerciseMuscles = {
	targetMuscleGroup: MuscleGroup;
	customMuscleGroup?: string | null;
	secondaryMuscleGroups?: readonly MuscleGroup[] | null;
};

/** The key a Whole body exercise's sets are counted under in per-muscle lists */
export const WHOLE_BODY = 'WholeBody' satisfies MuscleGroup;

/**
 * What one set of an exercise counts: per muscle (a muscle group's name, or a custom group's own) and
 * per body area. Cardio counts nowhere, a custom group under its name and in no area
 */
export function muscleShares(exercise: ExerciseMuscles): {
	muscles: Record<string, number>;
	areas: Partial<Record<BodyArea, number>>;
} {
	const { targetMuscleGroup: primary } = exercise;
	if (primary === 'Cardio') return { muscles: {}, areas: {} };
	if (primary === 'WholeBody') {
		return {
			muscles: { [WHOLE_BODY]: 1 },
			areas: Object.fromEntries(BODY_AREAS.map((area) => [area, WHOLE_BODY_AREA_SHARE]))
		};
	}
	// No inherited keys: a custom group can be named anything ("constructor", "__proto__")
	const muscles: Record<string, number> = Object.create(null);
	const areas: Partial<Record<BodyArea, number>> = {};
	const add = (name: string, area: BodyArea | null, share: number) => {
		muscles[name] = (muscles[name] ?? 0) + share;
		if (area) areas[area] = (areas[area] ?? 0) + share;
	};
	add(primary === 'Custom' ? (exercise.customMuscleGroup ?? 'Custom') : primary, bodyAreaOf(primary), 1);
	for (const muscle of secondaryMusclesFor(primary, exercise.secondaryMuscleGroups)) {
		add(muscle, bodyAreaOf(muscle), SECONDARY_SHARE);
	}
	return { muscles, areas };
}

/** A muscle group's name as shown, e.g. "Front delts", "Whole body" (as convertCamelCaseToNormal gives) */
export function muscleGroupLabel(muscleGroup: string): string {
	return muscleGroup
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.toLowerCase()
		.replace(/^\w/, (match) => match.toUpperCase());
}

const comparable = (name: string) => name.replace(/\s+/g, '').toLowerCase();

/**
 * Whether a custom muscle group's name is one of the built-in ones' ("Whole body", "chest",
 * "FrontDelts"...), whatever its capitals and spaces: the two would read the same in every list
 */
export function isBuiltInMuscleName(name: string, muscleGroups: readonly string[]): boolean {
	return muscleGroups.some((muscleGroup) => comparable(muscleGroup) === comparable(name));
}

/** A count of sets that can end in a half: "7", "7.5" */
export function formatSetCount(sets: number): string {
	return String(Math.round(sets * 10) / 10);
}
