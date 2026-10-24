import { test, expect } from '../fixtures';
import { DEFAULT_SETS, routineSetCount } from '../../src/lib/utils/routineSets';

/**
 * A routine decides how many sets each exercise gets. Routines saved before every exercise had a
 * set count can have none: that means the usual 3, everywhere routineSetCount is read.
 */

test('a routine exercise without a set count has the usual 3', () => {
	expect(DEFAULT_SETS).toEqual(3);
	expect(routineSetCount(null)).toEqual(3);
	expect(routineSetCount(undefined)).toEqual(3);
	expect(routineSetCount(0)).toEqual(3);
	expect(routineSetCount(5)).toEqual(5);
});
