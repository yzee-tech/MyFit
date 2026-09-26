-- AlterTable
ALTER TABLE "WeightSet" ADD COLUMN     "isAssistance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "exerciseNote" TEXT;

