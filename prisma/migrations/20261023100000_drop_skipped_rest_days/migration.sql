-- A block's workout could be marked Skipped or RestDay (WorkoutOfMesocycle.workoutStatus), and a
-- routine could be a rest day (ExerciseSplitDay.isRestDay). The app no longer makes either: skipping
-- a day is just not doing a workout. Production had no marked workouts and no rest-day routines
-- (checked before this was written), so nothing is lost. The columns go before the type they use.

-- AlterTable
ALTER TABLE "ExerciseSplitDay" DROP COLUMN "isRestDay";

-- AlterTable
ALTER TABLE "WorkoutOfMesocycle" DROP COLUMN "workoutStatus";

-- DropEnum
DROP TYPE "WorkoutStatus";
