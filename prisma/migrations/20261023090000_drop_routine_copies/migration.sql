-- Blocks used to keep their own copy of the routines (MesocycleExerciseSplitDay /
-- MesocycleExerciseTemplate), and a block's workouts pointed at a routine by its position in that
-- copy (splitDayIndex). Since PR 28 nothing reads or writes either: blocks use My routines and each
-- workout's routineName. Production had no rows left in the copy and no positions set (checked
-- before this was written), so nothing is lost.

-- DropForeignKey
ALTER TABLE "MesocycleExerciseSplitDay" DROP CONSTRAINT "MesocycleExerciseSplitDay_mesocycleId_fkey";

-- DropForeignKey
ALTER TABLE "MesocycleExerciseTemplate" DROP CONSTRAINT "MesocycleExerciseTemplate_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "MesocycleExerciseTemplate" DROP CONSTRAINT "MesocycleExerciseTemplate_mesocycleExerciseSplitDayId_fkey";

-- AlterTable
ALTER TABLE "WorkoutOfMesocycle" DROP COLUMN "splitDayIndex";

-- DropTable
DROP TABLE "MesocycleExerciseTemplate";

-- DropTable
DROP TABLE "MesocycleExerciseSplitDay";
