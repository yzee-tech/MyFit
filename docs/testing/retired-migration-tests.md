# Retired migration tests

19 tests in `tests/migrations/` (7 files) were retired, on the owner's decision. Each built data in the pre-migration
shape on a scratch database, ran one migration, and checked the result.

## What is lost, plainly

These tests proved that a migration **transforms old data correctly** and (for the data moves) that **running it twice
changes nothing**. That proof is gone. CI still applies every migration with `prisma migrate deploy`
(`.github/workflows/main-workflow.yml`), but on a fresh, empty database, so it only proves the SQL runs, not that it
moves existing rows correctly. That is not a replacement for replay against old data. Retiring them is an accepted
tradeoff, not a claim that they stopped being useful after deployment day.

The last version of every file is in git history: `git show b2b6e7f:tests/migrations/<file>`.

## What each covered, and what covers it today

| File (tests)                | Migration                                       | What it checked                                                                                     | Covered today by                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cardioMeasures` (3)        | `20261025090000_cardio_measures`                | Existing exercises and sets read as Reps; new distance and time values can be stored                | Old-data transform: nothing. Storing distance and time: `tests/progression/cardioServer.spec.ts`, `tests/models/cardio.spec.ts`                                                                                                                                                                                                               |
| `exerciseLevels` (2)        | `20261009090000_exercise_levels`                | Machine levels moved onto exercises; level sets deleted                                             | Old-data transform: nothing                                                                                                                                                                                                                                                                                                                   |
| `exerciseMachines` (2)      | `20261024090000_exercise_machines`              | Assistance-set weights and unit moved onto exercises; routine links                                 | Old-data transform: nothing                                                                                                                                                                                                                                                                                                                   |
| `mesocyclePause` (3)        | `20261101090000_mesocycle_pause`                | Existing workouts count toward progression; one open pause per block; pauses deleted with the block | One open pause: `tests/progression/mesocyclePause.spec.ts` "the database itself refuses a second open pause" (asserts `P2002` on `mesocycleId`). Pauses deleted with the block: the same file, "deleting a block deletes its pauses" (pauses, deletes through `deleteById`, count is 0). Existing workouts count: old-data transform, nothing |
| `myRoutines` (6)            | `20261004090000_my_routines`                    | One list per person, merge by active block, no rest days, blocks follow the list, idempotent re-run | Old-data transform and idempotent re-run: nothing. The one-list-per-person rule is `userId @unique` in `prisma/schema/exerciseSplit.prisma`; its app-level behaviour is in `tests/models/exercise-splits.spec.ts`, but the database rule itself has no direct test                                                                            |
| `optionalSplitDayIndex` (1) | `20261011090000_optional_split_day_index`       | Existing positions kept; a mesocycle workout can be saved without a split-day position              | A historical feature: `20261023090000_drop_routine_copies` dropped `WorkoutOfMesocycle.splitDayIndex`, so the raw-SQL NULL check has no current-model equivalent. Creating and linking a workout to a block today: `tests/progression/endOfPlanServer.spec.ts` "a workout saved after the plan ended"                                         |
| `workoutRoutineNames` (2)   | `20261010090000_backfill_workout_routine_names` | Mesocycle workouts got their routine's name; idempotent                                             | Old-data backfill and idempotent re-run: nothing                                                                                                                                                                                                                                                                                              |

## Left without a direct check

- The old-data transforms, backfills and idempotent re-runs above (the accepted tradeoff).
- The database-level one-list-per-person rule (`ExerciseSplit.userId` unique).

No new tests were added for these; adding them is a separate decision.
