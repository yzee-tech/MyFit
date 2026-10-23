# Changelog

What changed in MyFit, newest first.

## 2026-10-23: estimated 1RM, exercise charts, Warm up (PR #51)

### Added

- **Estimated 1RM chart**, now the first chart for a weighted exercise in Stats and History: one point per
  workout, from its best set, counting reps in reserve (80 kg × 8 with 2 in reserve ≈ 101.27 kg). Bodyweight
  exercises include the bodyweight share. Above the chart: the latest estimate and the change since the first one
  shown. Shown in your home unit, to 2 decimals.
- **Set volume** (a line per set) and **Session volume** (the workout's total) charts, counted like the Workouts list.

### Changed

- **Warm up** starts from the best estimate of your last 3 times doing the exercise (one light day doesn't lower
  it), and says which set it's from. With no history, or offline, it uses today's set 1. The 1-RM calculator has a
  reps in reserve box and uses the same formula as the chart.
- Warm up is no longer offered for bodyweight or reps-only exercises (as for levels).
- "Show sets" is greyed out, with why, for the one-line charts.
- An old skipped set reads "uncompleted" in a saved workout and when editing it.

### Fixed

- Warm up with 1 set showed "NaN": it's now 50% × 8 reps.
- Warm up's % column showed long decimals (53.333333333333336): now to 0.1 (53.3).
- Opening Warm up again for the same exercise starts afresh, and closes the exercise menu.
- The 1-RM calculator with no weight or no reps says so and stays open, instead of keeping the old number as if
  it had worked.

## 2026-10-23: charts, finishing a workout, editing a past one (PR #50)

### Fixed

- **Charts follow light and dark mode** straight away (also System following the phone), without a reload:
  the dashboard, Stats, exercise, block and workout charts.

### Changed

- **Finishing with sets not ticked** removes them (and an exercise left with none): "Remove them and
  finish?". Nothing ticked at all offers Keep going or Discard. Sets are no longer saved as skipped; old
  workouts keep theirs.
- **A workout never changes its routine**: no more "Update routine?" when saving. Change routines in My
  routines (Save as routine on a finished workout stays).
- **Exercise menu in a workout:** Edit, Warm up, History, Delete ("Skip sets left" is gone). When editing a
  past workout: **Replace** (swap a wrongly logged exercise, keeping its sets), History, Delete.
- **Compare:** a set not done last time reads "uncompleted last time".

## 2026-10-23: Workouts page and menu (PR #49)

### Changed

- **Workouts:** a Hide calendar button (remembered on this phone) for more room for the list, bigger month
  arrows (also on a block's Workouts tab), and Filters and Start workout side by side.
- **Calendar hints:** no line under the calendar any more. Holding a day picks it straight away; the Showing box
  then says what to do next ("From Oct 5: now tap the last day"), or for one day, how to pick a range. A block's
  Workouts tab has the same Showing box, with Show all.
- **Menu:** Dashboard and Stats first, then Exercises, My routines, Mesocycles and Workouts.
- **Changelog:** this page shows these notes (it used to look for GitHub releases, of which there are none); the
  unused "What's new?" pop-up is gone.

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
