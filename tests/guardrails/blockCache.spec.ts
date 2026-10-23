import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * One routine list per person (My routines): mesocycles and workouts use it and Workout.routineName.
 * Mesocycles' old copy of the routines was dropped from the database, so the type check catches any use
 */

const srcDir = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return name === 'zodSchemas' ? [] : sourceFiles(full);
		return /\.(ts|js|svelte)$/.test(name) ? [full] : [];
	});
}

const listCreate = /\bexerciseSplit\.(create|createMany)\b|\bexerciseSplits?\s*:\s*\{\s*create/;

test('nothing makes a second routine list', () => {
	const offenders: string[] = [];
	for (const file of sourceFiles(srcDir)) {
		const text = readFileSync(file, 'utf8');
		const relative = path.relative(process.cwd(), file);
		// One list per person: only ensureMyRoutines (an upsert) makes it
		if (listCreate.test(text)) offenders.push(`${relative}: creates an ExerciseSplit`);
	}
	expect(offenders).toEqual([]);
});
