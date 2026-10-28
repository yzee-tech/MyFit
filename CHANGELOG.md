# Changelog

What changed in MyFit, newest first.

## 2026-10-28: clean-up after the weeks and hints work (PR #58)

### Fixed

- Switching an exercise between kg and lb now converts the number a cleared weight box would
  restore, so emptying the box brings back the right weight in the new unit.
- Continuing or resuming a workout whose suggestions failed to load, from the start page or the
  workout panel, tries the load again instead of leaving an empty workout.
- The suggestions and the welcome-back card now use the phone's clock for the week and the days
  since the last workout, so they agree with the week label around midnight and week changes.
  A missing or invalid time falls back to the server's clock.
- Starting a new workout clears a failed-load flag or reps-only settings left by the one before;
  a late answer from an earlier workout no longer lands in the new one.
- Editing a past workout no longer creates a reps hint, and emptying a reps box there leaves it empty.
- Editing a workout started in the repeated hour when clocks go back keeps its start time exactly.

### Changed

- The welcome-back card counts calendar days on the phone: Monday evening to the next Monday
  morning is 7 days.

## 2026-10-27: workout weeks and reps hints (PR #57)

### Fixed

- Weeks are now counted by local calendar day in the phone's timezone: day 8 is Week 2,
  even when fewer than 168 hours have passed. This applies to week labels and deload suggestions.
  A missing or invalid timezone falls back to UTC. Saved deload flags are not rewritten; editing
  a workout keeps its flag unless its start changes. A displayed week can differ from the
  week an earlier in-progress label showed; a workout already in progress keeps its starting week.
- The reps hint stays put while reps or RIR are typed or cleared. Use and Previous start a new
  baseline. The hint now says "1 rep".
- Editing only a workout's length keeps the original start time, including seconds and milliseconds.
- A failed request for workout suggestions shows a message with a Retry button; reloading the page loads them.

### Changed

- A block's weekly effort marks its current week. The deload badge is no longer filled by default.
- A past workout shows its block week under the block name, without capping it: Week 9 can appear
  in a 6-week block when that workout was done after the planned end.
- The routine chip opens that routine in My routines when it still exists. The block name stays
  a link without an underline.

## 2026-10-26: export follow-ups (PR #55)

### Changed

- **Export downloads use gzip when the client accepts it**, so the 4 MB download limit applies to the
  compressed file. Other clients receive plain UTF-8 with the same byte limit; the download itself is unchanged.

- If a JSON export is still too large, the message suggests trying the smaller CSV format. A refused CSV
  no longer suggests trying CSV again, and neither message points to unsupported contact options.

- The JSON export's `appVersion` is now the deployed commit instead of a build timestamp, so it identifies
  the exact app version that produced the file.

## 2026-10-26: export all your data (PR #54)

### Added

- **Settings > Your data**: Download JSON (everything MyFit stores about you) or Download CSV (one row per set,
  with `setIndex` from 0 and `setNumber` from 1). Exports are read-only and can't be imported back. The buttons show
  a spinner while the file is prepared, and a message if the export is refused (too large, or a second download
  within a minute).

- A refused or failed export doesn't use up the one-per-minute limit.

- If your sign-in has expired while Settings is open, Download now shows "Your session has expired" instead of saving the login page as the export file.

## 2026-10-24: removed unused 'Update routine' server code (PR #53)

### Removed

- The server code behind the old "Update routine?" prompt after saving a workout: its preview
  endpoint and the routine-rewrite transaction, which were no longer used. No visible change.

## 2026-10-24: machines on the exercise, assisted machines (PR #52)

### Added

- **Machine** on the exercise (Exercises page): one switch, then **It shows: Weights or Levels**. A machine's weights
  are its own, the same at every gym: its unit (fixed: its sets always show in it, with no kg/lb switch), a range
  plus single weights for uneven stacks, and **Copy from a weight set**. Levels work as before.
- **Assisted machine**, for both kinds. Weights are help (typed as −20 for 20 kg of help); turning it on also counts
  bodyweight at 100%, with a warning if that's switched off. With levels, a higher level is more help, so suggestions
  go **down** a level once every set reaches the top of the rep range.

### Changed

- Assisted weight sets moved onto their exercise automatically, when the exercise used exactly one of them (not for
  reps-only or levels exercises). Its other weight-set links in routines were cleared, and the set deleted once
  nothing else used it. Bodyweight settings weren't changed.
- New weight sets are for dumbbells and plates: no Assisted switch. An assisted set that's left says to move it
  onto its exercise.
- A routine's exercise editor shows a machine's own weights instead of the weight set box.
- **"Ask each time" routines:** no weight set box for exercises that aren't machines ("Weights come from the gym you
  pick when you start the workout"). The gym picked at the start ("Weights here") now always decides, even over an
  exercise's own weight set in that unit.
- "Weights here" never changes a machine.

### Fixed

- Assisted exercises without a bodyweight share got backwards suggestions (more reps for less help): now the help
  stays the same and reps go up. With a bodyweight share they already worked.
- The exercise ⋯ menu in a workout (live or past) stuck to the top of the screen when its exercise was scrolled
  away: it now closes.
- Long forms in a dialog (e.g. an exercise with a machine) scroll, so Save stays reachable.

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
