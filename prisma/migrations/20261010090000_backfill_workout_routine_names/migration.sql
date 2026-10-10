-- BEGIN DATA MIGRATION
-- Every mesocycle workout gets the name of the routine it was done from, so nothing needs the
-- mesocycle's own copy of the routines to show it. Workouts that have a name keep it; rest days have none
UPDATE "Workout" w
SET "routineName" = d."name"
FROM "WorkoutOfMesocycle" wm
JOIN "MesocycleExerciseSplitDay" d
  ON d."mesocycleId" = wm."mesocycleId" AND d."dayIndex" = wm."splitDayIndex"
WHERE wm."workoutId" = w."id"
  AND w."routineName" IS NULL
  AND NOT d."isRestDay"
  AND d."name" <> '';
-- END DATA MIGRATION
