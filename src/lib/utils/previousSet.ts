import { roundWeight } from './weightUnits';

/** What an exercise's load box holds: a weight, a weight on top of bodyweight, a level, or nothing */
export type LoadKind = 'weight' | 'bodyweight' | 'level' | 'repsOnly';

/** A set from last time, loads in today's unit */
export type PreviousSet = { reps: number; load: number; skipped: boolean };

/**
 * A set from last time, short, for the workout's "Previous" column (the column header gives the
 * unit): "60 × 10"; with bodyweight "+10 × 8", "BW × 8" or "−20 × 8"; "L5 × 10"; reps only "12";
 * "–" for none or skipped
 */
export function formatPreviousSet(set: PreviousSet | undefined, kind: LoadKind): string {
	if (!set || set.skipped) return '–';
	if (kind === 'repsOnly') return `${set.reps}`;
	const load = roundWeight(set.load);
	if (kind === 'level') return `L${load} × ${set.reps}`;
	if (kind === 'bodyweight') {
		const added = load > 0 ? `+${load}` : load < 0 ? `−${-load}` : 'BW';
		return `${added} × ${set.reps}`;
	}
	return `${load} × ${set.reps}`;
}

/** A load as the reps hint says it, e.g. "70 kg", "+10 kg", "bodyweight", "−20 kg" */
export function formatHintLoad(load: number, unitLabel: string, kind: LoadKind): string {
	const value = roundWeight(load);
	if (kind !== 'bodyweight') return `${value} ${unitLabel}`;
	if (value === 0) return 'bodyweight';
	return value > 0 ? `+${value} ${unitLabel}` : `−${-value} ${unitLabel}`;
}
