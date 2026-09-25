-- kg / lb support. Weights stay stored in kg; existing data was entered in kg.

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

-- CreateEnum
CREATE TYPE "RoutineWeightUnit" AS ENUM ('KG', 'LB', 'ASK');

-- AlterTable
ALTER TABLE "ExerciseSplitDay" ADD COLUMN     "weightUnit" "RoutineWeightUnit" NOT NULL DEFAULT 'KG';

-- AlterTable
ALTER TABLE "MesocycleExerciseSplitDay" ADD COLUMN     "weightUnit" "RoutineWeightUnit" NOT NULL DEFAULT 'KG';

-- AlterTable
ALTER TABLE "MesocycleExerciseTemplate" ADD COLUMN     "weightUnit" "WeightUnit";

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "homeWeightUnit" "WeightUnit" NOT NULL DEFAULT 'KG';

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "weightUnit" "WeightUnit" NOT NULL DEFAULT 'KG';

