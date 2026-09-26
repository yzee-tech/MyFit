# Travel-friendly training: plan

MyFit was built around one gym and a fixed weekly rotation. This fork is being changed for someone who trains at
different gyms while traveling, with a routine per location, and who picks one routine each session.

## Decisions

| #   | Decision                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Routine library**: an exercise split holds any number of routines (was: days). No rest days, no rotation.                    |
| 2   | **Pick a routine** each session. A block includes all routines by default; routines can be added mid-block.                    |
| 3   | **Progression follows the exercise** by exact name: the last time it was done, in any routine, block, or workout outside one.  |
| 4   | **Exercise name suggestions** when adding exercises, so names stay consistent.                                                 |
| 5   | **Blocks** (mesocycles): length and each week's effort (RIR) chosen week by week, including a deload week. Weeks are calendar. |
| 6   | **Automatic set increases are off.** A routine keeps the sets written into it.                                                 |
| 7   | **Welcome-back rule**: 7+ days (setting) with no workout → repeat last numbers with 1 extra RIR for that session.              |
| 8   | **Units**: home unit kg; each routine is kg, lb or "ask each time"; per-exercise toggle; stored in kg with the unit used.      |
| 9   | **Weight sets**: saved lists (e.g. 5–10 kg by 1, 14, 20) or range + step, linked per exercise; suggestions use real weights.   |

Deload week: same weights as last time, half the sets, easy effort; not used as the baseline to beat next time.

## Releases

0. **Safe previews**: migrations run only on production, or on previews that have their own Neon database branch
   (`MIGRATE_PREVIEW_DB=1`).
1. **Pick any routine + cross-routine progression**: routine picker replaces the rotation (and skip/rest-day flows);
   history by exercise name across all workouts; calendar-week blocks; automatic set increases off; name suggestions.
2. **Routine library, weekly effort plan, welcome back**: split/day → library/routine wording and editor; week-by-week
   RIR picker with deload; choose routines per block and add mid-block; welcome-back rule and setting.
3. **kg and lb**: home unit; routine unit incl. "ask each time"; per-exercise toggle; conversions; existing data = kg.
4. **Weight sets**: manage in Settings; link per exercise; rounding to available weights; big-jump handling with a
   "next weight" note.

## Exercises as records

Each exercise is one record (`Exercise`) that library routines, block routines and logged workouts
link to. A rename or a correction is made once and applies everywhere, and progression follows the
exercise rather than its spelling.

| Where                                    | What                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Exercise** (applies everywhere)        | Name, muscle group, bodyweight share (a correction also recounts past workouts), exercise note                                           |
| **Routine** (library and block)          | Order, set type, rep ranges, sets (blocks), weights available, weight step, kg/lb override, progression overrides (blocks), routine note |
| **Logged workout** (a record of the day) | Every set (load may be negative: assistance), bodyweight that day, unit and weight set used, routine settings and both notes at the time |

Routines and workouts keep a copy of the exercise's details for display; the server
(`$lib/server/exercises.ts`) keeps every copy in step.

- **PR 1 – foundation** (no visible change): `Exercise` table and links, conversion of existing data,
  saves and progression via the exercise, a real rename on Exercise stats, V2 import removed.
- **PR 2 – Exercises page**: the only place exercise details change (routine and workout editors
  pick exercises from your list, with a New exercise button); blank workouts, with exercises added
  mid-workout suggested from last time.
  Also: list, new exercise (also outside any routine), edit/rename everywhere,
  add to / remove from routines, delete (archived when it has history), merge on Exercise stats,
  saved exercises in suggestions, "Added (+) / assist (−)" load label with the result, weight sets
  for assisted machines, routine and exercise notes, and Save on the exercises screen of the library
  and block editors (no overview step).
- **PR 3 – Levels** (planned): a third option next to kg and lb for machines that show levels;
  progression adds reps to the top of the range, then moves to the next level.
