import { roundWeight } from './weightUnits';
import { formatDuration, fromMeters, roundDistance, distanceUnitLabel } from './distanceUnits';
import type { DistanceUnit, ExerciseMeasure } from './prismaEnums';

/** What an exercise's load box holds: a weight, a weight on top of bodyweight, a level, or nothing */
export type LoadKind = 'weight' | 'bodyweight' | 'level' | 'repsOnly';

/** A set from last time, loads in today's unit; time in seconds and distance in metres for cardio sets */
export type PreviousSet = {
	reps: number;
	load: number;
	skipped: boolean;
	timeSeconds?: number | null;
	distanceMeters?: number | null;
};

/** How a cardio set from last time is shown: its measure, and the unit its distance is shown in */
export type PreviousCardio = { measure: ExerciseMeasure; distanceUnit: DistanceUnit | null };

/**
 * A set from last time, short, for the workout's "Previous" column (the column header gives the
 * unit): "60 × 10"; with bodyweight "+10 × 8", "BW × 8" or "−20 × 8"; "L5 × 10"; reps only "12";
 * "–" for none or skipped. Cardio: "26:00", with a level "L8 · 0:30", with a distance "5 km · 26:00"
 */
export function formatPreviousSet(
	set: PreviousSet | undefined,
	kind: LoadKind,
	cardio: PreviousCardio = { measure: 'Reps', distanceUnit: null }
): string {
	if (!set || set.skipped) return '–';
	if (cardio.measure !== 'Reps') return formatPreviousCardioSet(set, kind, cardio);
	if (kind === 'repsOnly') return `${set.reps}`;
	const load = roundWeight(set.load);
	if (kind === 'level') return `L${load} × ${set.reps}`;
	if (kind === 'bodyweight') {
		const added = load > 0 ? `+${load}` : load < 0 ? `−${-load}` : 'BW';
		return `${added} × ${set.reps}`;
	}
	return `${load} × ${set.reps}`;
}

function formatPreviousCardioSet(set: PreviousSet, kind: LoadKind, cardio: PreviousCardio): string {
	const parts: string[] = [];
	if (kind === 'level') parts.push(`L${roundWeight(set.load)}`);
	if (cardio.measure === 'DistanceTime' && typeof set.distanceMeters === 'number') {
		const unit = cardio.distanceUnit ?? 'KM';
		parts.push(`${roundDistance(fromMeters(set.distanceMeters, unit))} ${distanceUnitLabel(unit)}`);
	}
	parts.push(typeof set.timeSeconds === 'number' ? formatDuration(set.timeSeconds) : '–');
	return parts.join(' · ');
}

/** A load as the reps hint says it, e.g. "70 kg", "+10 kg", "bodyweight", "−20 kg" */
export function formatHintLoad(load: number, unitLabel: string, kind: LoadKind): string {
	const value = roundWeight(load);
	if (kind !== 'bodyweight') return `${value} ${unitLabel}`;
	if (value === 0) return 'bodyweight';
	return value > 0 ? `+${value} ${unitLabel}` : `−${-value} ${unitLabel}`;
}
