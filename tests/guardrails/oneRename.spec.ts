import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * Exercises are renamed in one place: Exercises › the exercise › Edit (exercises.update, with its one
 * name check). Stats used to have a second way in ("Bulk rename to", users.renameExercises); it's gone
 */

const srcDir = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) return sourceFiles(full);
		return /\.(ts|js|svelte)$/.test(name) ? [full] : [];
	});
}

// The exact names, not the word "rename": routines are renamed too
const secondRenamePath = /\brenameExercises?\s*[(:.]|\busers\.renameExercises\b|Bulk rename/;

test('exercises are renamed in one place only', () => {
	const offenders = sourceFiles(srcDir)
		.filter((file) => secondRenamePath.test(readFileSync(file, 'utf8')))
		.map((file) => path.relative(process.cwd(), file));
	expect(offenders).toEqual([]);
});
