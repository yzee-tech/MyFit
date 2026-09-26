import { z } from 'zod';

/**
 * Routines and workouts loaded from the server carry the link to their exercise. The server
 * sets that link itself when saving (see $lib/server/exercises.ts), so anything a client sends
 * about it is dropped before the strict input check.
 */
export function ignoreExerciseLink<T extends z.ZodTypeAny>(schema: T) {
	return z.preprocess((value) => {
		if (value === null || typeof value !== 'object') return value;
		const { exercise, exerciseId, ...rest } = value as Record<string, unknown>;
		return rest;
	}, schema) as unknown as z.ZodEffects<T, z.output<T>, z.input<T> & { exerciseId?: string | null }>;
}
