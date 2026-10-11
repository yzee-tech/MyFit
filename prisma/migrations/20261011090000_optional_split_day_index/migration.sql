-- Workouts name their routine (Workout.routineName): the old position in the mesocycle's copy of the
-- routines is no longer written. Existing values stay as they are.
ALTER TABLE "WorkoutOfMesocycle" ALTER COLUMN "splitDayIndex" DROP NOT NULL;
