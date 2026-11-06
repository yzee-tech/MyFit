import { DELOAD_WEEK } from '$lib/utils/workoutUtils';

/** What a week of a block can ask for: reps kept in reserve, or a deload */
export const effortOptions = [
	{ value: 4, label: '4 RIR' },
	{ value: 3, label: '3 RIR' },
	{ value: 2, label: '2 RIR' },
	{ value: 1, label: '1 RIR' },
	{ value: 0, label: '0 RIR (failure)' },
	{ value: DELOAD_WEEK, label: 'Deload' }
];

export function effortOption(value: number) {
	return effortOptions.find((option) => option.value === value) ?? effortOptions[1];
}
