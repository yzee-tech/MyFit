# Retired migration tests

19 tests in `tests/migrations/` (7 files) were retired. Each built data in the pre-migration shape on a scratch
database, ran one migration, and checked the result. That check is only informative on the day the migration is
deployed; afterwards it re-tests a past event on every CI run. CI still applies every migration with
`prisma migrate deploy` (`.github/workflows/main-workflow.yml`), so a migration that fails to apply still fails CI.

Retired on the owner's decision (all 19). The last version of every file is in git history: `git show b2b6e7f:tests/migrations/<file>`.

| File (tests) | Migration | What it checked | Still checked today by |
| --- | --- | --- | --- |
| `cardioMeasures` (3) | `20261025090000_cardio_measures` | Existing exercises/sets read as Reps; new distance and time values can be stored | Data move: nothing (one-time). Storing distance/time: `tests/progression/cardioServer.spec.ts`, `tests/models/cardio.spec.ts` |
| `exerciseLevels` (2) | `20261009090000_exercise_levels` | Machine levels moved onto exercises; level sets deleted | Data move: nothing (one-time) |
| `exerciseMachines` (2) | `20261024090000_exercise_machines` | Assistance-set weights/unit moved onto exercises; routine links | Data move: nothing (one-time) |
| `mesocyclePause` (3) | `20261101090000_mesocycle_pause` | Existing workouts count toward progression; one open pause per block; pauses deleted with the block | One open pause: `tests/progression/mesocyclePause.spec.ts` "the database itself refuses a second open pause" (now also asserts the refusing field). Existing workouts count: nothing (one-time). **Pauses deleted with the block: no direct test** (every test's user cleanup exercises the cascade but asserts nothing about it) |
| `myRoutines` (6) | `20261004090000_my_routines` | One list per person, merge by active block, no rest days, blocks follow the list, idempotent re-run | Data move and idempotency: nothing (one-time). **The database rule "one list per person": no direct test** (the app-level naming/one-list behaviour is in `tests/models/exercise-splits.spec.ts`) |
| `optionalSplitDayIndex` (1) | `20261011090000_optional_split_day_index` | Existing positions kept; a mesocycle workout can be saved without a split-day position | Existing positions: nothing (one-time). **Saving without a position: no direct test found** |
| `workoutRoutineNames` (2) | `20261010090000_backfill_workout_routine_names` | Mesocycle workouts got their routine's name; idempotent | Nothing (one-time backfill) |

## Rules that lose their only direct check

Three rules that outlive the one-time change had a test here and have no direct live test. They are listed so the
loss is visible, not because anything is known to be broken:

1. Deleting a mesocycle deletes its pauses (cascade).
2. The database allows only one `ExerciseSplit` (list) per person.
3. A mesocycle workout can be saved without a split-day position.

If any of these should keep a check, it is a small live test; say which and it is added in its own change.
