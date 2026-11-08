# Changelog

What changed in MyFit, newest first.

## 2026-11-07: Quick add test guards, safe failure evidence and database-only previews

### Tests

- Quick add checks each requested checkbox, the exact Add count, and each resulting exercise menu. A missed
  selection now fails in the helper instead of allowing a later missing-exercise failure. No app behavior or
  timeout changed; the earlier intermittent cardio failure's cause is still unconfirmed.
- A browser-backed helper contract covers normal Run/Bike selection and a deliberately ignored Run click.
- CI saves a small validated record for every test attempt (about one per test, kept 7 days) and the
  original failed attempt's full evidence: an action-only Trace Viewer timeline and fixed selection/picker
  state, including step timings. Only validated records are uploaded, never raw traces, DOM, network,
  login/session data, screenshots or videos. A runner failure/retry smoke checks retention and the
  fail-on-flaky exit.

### Deployment

- Automatic previews are limited to database schema or migration changes. Ordinary app, test and docs changes
  skip previews; production deployments and the existing CI jobs are unchanged. The trusted preview workflow
  needs its approved Vercel deployment secret and post-merge activation checks before it is operational.

## 2026-11-06: one editor for a block's weeks, and a block pauses itself when its plan is over

### Changed

- **Edit and Extend are one page.** Edit on a block (or Extend, when it has run all its weeks) opens one page: the
  name, a row for each week, and the progression settings, with Cancel and Save. There are no Basics and Progression
  steps, no duration box and no "Use suggested" when you edit a block. **+ Add week** adds one week like the last one
  (a Deload copies as a Deload) and never touches the others; the bin removes a week that is still ahead (never the
  last one left). A block can have up to 52 weeks; a new block still starts at 20 at the most, and a block longer than
  20 is never cut short. New and Clone work as before.
- **Save goes back to the list of mesocycles.** On a block past its planned weeks the button that ends it reads
  **Finish block** (it said Stop).
- **Your changes wait for Save.** Cancel throws all of them away: nothing is saved, and they are not there when you
  open the block again, in New, or in another block. If Save fails (no connection, a refusal, an error) you stay on the
  page with everything you changed and can try again.
- **Weeks that are done or in progress are locked.** On a running block the weeks up to and including the current one
  can't be changed or removed; the weeks ahead can. If the week turns while you are editing, Save says which weeks are
  locked now and keeps your changes; **Restore** puts a locked week back. A finished block can't be edited (Clone
  still works).

### Added

- **A block pauses itself when its plan is over.** Once a block has run all its planned weeks it is paused at the
  moment its plan ended, not when you next open the app, and it is never finished for you. A block left for weeks does
  not count weeks that are not in its plan: it stays at "Past its planned weeks", with Extend and Finish block.
- **Extend, then Resume.** Adding weeks and saving does not resume the block: Resume is its own step, and it waits
  until the block has another week to go on into. Finish block ends it and closes the pause.
- A workout that is saved is written together with its place in the block in one step, so a block can't be finished
  or changed between the two.
- A workout you start after the plan ended is an ordinary workout, not part of the block. One you started before it
  and save later keeps its place.

### Fixed

- **"Force RIR matching" now toggles its own switch.** Its label pointed at "Take last set to failure", so tapping
  the label changed the other one.
- **A screen that is out of date can no longer start or finish a block again.** Start and Finish now check the block
  itself, not what the screen showed: a Start from a screen that saw the block unused, after it was started or even
  finished on another device, and a repeated or old Finish, are refused with "changed on another device". A finished
  block keeps its dates and no longer takes back My routines.
- **A workout belongs to a block only if it began inside it.** One that began before the block started, at or after it
  was finished, or (for a block finished before it was paused where its plan ended) after the place its plan ended, is
  an ordinary workout. One that began before the block was finished and is saved later still belongs to it. Editing the
  start of a workout that is already in a block keeps its place in the block, as before.
- **Finish is offered only once the page knows the block's real state.** A block past its plan is paused by a request
  the page sends when it opens. Until the answer was on the screen, Finish was already on offer, and a quick tap named
  "no pause" while one existed and was refused as "changed on another device". On the start page and on the block
  page, Finish now waits for that answer to be read and shown (also when another request had already made the pause),
  and if it can't be read the page says so and offers **Try again** instead of looking ready.
- **A workout started after the automatic pause is not counted toward progression by default.** The start page's
  "Counts toward progression" switch now follows the block when the page learns it has been paused (it stayed on); a
  workout in progress keeps its own choice, and a switch you have turned yourself is left alone.
- **Nothing you change in the editor is lost while Save is on its way.** The name, the weeks, Add week, the bins and
  the progression settings are switched off until the answer comes, so what is saved is what was on the screen when
  you pressed Save; if Save fails they all come back, with everything you changed.

### Known limits

- A pause made by hand on the first day of a week leaves that week open to editing while the block is paused; it locks
  when you resume.
- The block's days are counted in the timezone of the phone that notices the plan has ended. Travelling between
  timezones in that moment can move the end by a day, and the weeks locked while paused with it.
- Workouts that were already saved in a week after the plan ended keep their link to the block. The week they show
  now counts from where the plan ended (for example "Week 6" where it said "Week 7").

---

## 2026-11-05: scrolling with an exercise ⋯ menu open leaves the list where you scrolled it

### Fixed

- **The exercise ⋯ menu no longer pulls the list back up.** The menu already closed when its button scrolled out of
  view, but closing it gave the focus back to the button, and the browser scrolled the list back up to show it,
  undoing your scroll. Closing the menu by scrolling now leaves the list where you scrolled it. Closing it any other
  way (Escape, picking an item, tapping outside) still puts the focus back on the button.
- The test for this now checks that the list stays where it was scrolled. The old test only passed when it happened
  to look during the few milliseconds before the list jumped back, so it failed about 3 runs in 55.

---

## 2026-11-04: lists in order, cardio wording, timer-style time box, block routines like My routines

### Changed

- **Lists are in alphabetical order.** The muscle group list when you make an exercise (Custom last), the muscle
  group filter buttons in Add exercises and the routine exercise picker, the exercise list on Stats › Exercises
  (its muscle group headings now read "Front delts", not "FrontDelts"), the mesocycle lists in the Workouts filter
  and on Stats › Exercises (blocks with the same name: newest first), and the routine list on a block's workouts
  chart. On that chart a running block follows your My routines order; a finished block is A to Z. Lists with an
  order of their own (set type, weekly effort, the gym's unit) stay as they are.
- **Cardio exercises in Add exercises say how they are measured** ("Time", "Distance & time in km") instead of
  "Independent, 8-15 reps", which never applied to them.
- **Time boxes (cardio) work like a timer.** Type the digits and the colons appear: the last two digits are the
  seconds. 45 gives 0:45, 1500 gives 15:00, 9045 gives 90:45 (shown as 1:30:45 once you leave the box), 10530 gives
  1:05:30. Up to 6 digits. This changes one habit: **15 now means 15 seconds** (15 minutes is 1500), and three or
  more digits are read as minutes and seconds ("900" is 9:00, not 900 minutes). Times you already logged are
  unchanged.
- **A block's Routines tab looks like My routines.** One card for each routine, in your My routines order, all
  closed to start: its name, how many exercises and the unit, and its muscle groups. Tap a name to open its
  exercises (several can be open); an opened routine has an Edit button that opens it in My routines. The row of
  routine tabs and the "Edit ›" link are gone.

## 2026-11-03: faster test runs

### Changed

- **Behind the scenes:** GitHub now runs the tests two at a time, which cut a full test run from about 15 minutes to
  about 10, and retries a failing test twice instead of three times so a persistent failure shows up sooner. Nine
  tests that repeated a neighbour were folded into it (same checks), about 25 seconds less per run. Nothing in the
  app changes.

## 2026-11-01: pause a mesocycle, and choose whether a workout counts toward progression

### Added

- **Pause a mesocycle** (compact Pause / Resume and Stop buttons on its page, all the same size, with icons, e.g. for a holiday). Its week count stands
  still while it is paused, and resuming carries on in the same week. The dashboard, start page and mesocycle page
  read "Week N - paused". Stopping a paused mesocycle asks first and closes the pause. Past workouts keep the week
  they were done in. Workouts started while it is paused are ordinary workouts, not part of the mesocycle. A paused
  mesocycle that is past its planned weeks reads "Week N - paused" (not "Block finished"), and a paused block shows
  no effort chip on the dashboard. Pause, Resume and Stop wait for each other, so a Pause at the same moment as a Stop
  can't leave a pause open on a finished mesocycle.
- **"Counts toward progression" switch** on the Start workout page (for a routine or a blank workout) and on a
  workout's page. Off means the workout is saved in your history, stats and charts, but isn't used to calculate your
  weights and reps progression (or the Previous column); a workout with the switch off shows a "Not counted" tag.
  It starts on, and off while the mesocycle is paused (you can turn it on). Editing a workout keeps its choice.
- The data export includes pauses and a countsForProgression column (CSV, after isDeload).

### Changed

- **Extend opens the block in the mesocycle editor.** On the Start workout page, when a block has used up its planned
  weeks, Extend now opens the mesocycle editor with that block's name, weeks and settings loaded as saved, instead of
  linking to the block's page. If the block can't be loaded (e.g. you're offline), it says so and you stay put.

## 2026-10-31: small fixes (calendar spacing, gym weights on the start page)

### Fixed

- **"Weights here" on the start page** listed each machine's own weights (e.g. "Leg press (AMHK)") next to the gym's
  weight sets. It now lists only the gym's weights; a machine always uses its own.

### Changed

- **Workouts calendar**: the month name is larger and there is less space between the heading and the calendar, so
  more of the workouts below show. The calendar itself is the same size. The mesocycle's calendar is the same
  calendar, so it matches.

### Added

- **A clear "x" in the exercise search boxes** (the Add exercises sheet, the Exercises page, the exercise picker in
  routines and mesocycles, the Mesocycles page and the exercise search on Stats). It shows when there is text and
  empties the box with one tap, keeping the cursor there. On Mesocycles it also removes the search from the link; on
  Stats it keeps the exercise and its chart.

## 2026-10-30: cardio exercises (PR #56)

### Added

- **How it's measured** on the exercise (Exercises page): **Reps** (reps and a weight, everything until now),
  **Time** (a plank, a stair climber, bike intervals) or **Distance** (a run, a row, a ride). Distance exercises pick
  a unit: km, mi, m or ft. Distances are kept in metres, so the unit can change later without changing past runs;
  how an exercise is measured is fixed once it has workouts (make a new exercise for a change).
- **Cardio set rows** in a workout: a time box (m:ss, or minutes), a distance box in the exercise's unit with the
  pace worked out under it (per km or mile; per 500 m for metres; per 100 ft), and a level box on a machine with
  levels. No reps, weight or RIR. "Previous" and tap-to-copy work as for lifts; sets are **intervals**: a steady run
  is 1, 8 × 30 s sprints are 8.
- Suggestions for cardio repeat last time's intervals, never progress them, and a deload week doesn't cut a run
  short. First time, the boxes start empty.
- A **Cardio** muscle group, with built-in Running, Treadmill, Rowing machine, Stationary bike, Stair climber and
  Elliptical to start from.
- Cardio charts on Stats: **Total time**, and for distances **Total distance** and **Pace**, one point per workout.
  Past workouts and History show a cardio row's level, distance, time and pace.

### Changed

- The routine editor shows **Intervals** for a cardio exercise instead of sets, a set type, a rep range, weights and
  progression overrides.
- Cardio stays out of the sets-per-muscle charts (the Cardio group isn't a muscle), 1RM, Warm up, volume and the
  workout comparison; its intervals still count in the total sets done. A Time exercise in a muscle group (a plank in
  Abs) still counts its sets under that muscle.
- Saving a workout checks each cardio interval has its time (and distance); an app version from before cardio is
  asked to reopen the app, as its save can't carry them.
- The CSV export has two new columns at the end, `timeSeconds` and `distanceMeters`, filled for cardio sets (the
  JSON export carries them on every set).

### Fixed

- Sets that follow set 1 (copies of its numbers) keep following it after the exercise is edited in its
  drawer (a note, a picked weight set, the routine settings), not only after a kg/lb switch.

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
  a late answer from an earlier workout, including the reps-only lookup of a past workout that was
  discarded, no longer lands in the new one.
- Sets that follow set 1 (copies of its numbers) keep following it after switching an exercise between kg
  and lb.
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
