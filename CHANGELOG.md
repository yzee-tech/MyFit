# Changelog

What changed in MyFit, newest first.

## 2026-10-23: cleanup (PR #48)

### Removed

- **Blocks' own copy of the routines** (the `MesocycleExerciseSplitDay` and `MesocycleExerciseTemplate` tables), and
  each block workout's position in that copy (`WorkoutOfMesocycle.splitDayIndex`). Blocks and their workouts have used
  My routines and each workout's routine name since PR #28.
- **Skipped and rest days** (`WorkoutOfMesocycle.workoutStatus` and the `WorkoutStatus` type): a day skipped is just a
  day with no workout.
- **Rest-day routines** (`ExerciseSplitDay.isRestDay`), and the rest day in the Pull Push Legs template.

There was nothing to lose: the database had no rows in the copy, no positions set, no skipped or rest days and no
rest-day routines when this was done.

Still works:

- Routines files exported before this import as before; any rest days in them are left out.
- Older app versions that still send a position or a status when saving a workout save normally (both are ignored).
  One that starts a workout by position is asked to reopen the app, as before.
- Old links with a skipped or rest day filter open the Workouts list without it.

## Earlier

PRs #1 to #47: see the [merged pull requests](https://github.com/yzee-tech/MyFit/pulls?q=is%3Apr+is%3Amerged).
