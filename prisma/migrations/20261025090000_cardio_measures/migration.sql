-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('Reps', 'Time', 'DistanceTime');

-- CreateEnum
CREATE TYPE "DistanceUnit" AS ENUM ('KM', 'MI', 'M', 'FT');

-- AlterEnum
ALTER TYPE "MuscleGroup" ADD VALUE 'Cardio';

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "distanceUnit" "DistanceUnit",
ADD COLUMN     "measure" "ExerciseMeasure" NOT NULL DEFAULT 'Reps';

-- AlterTable
ALTER TABLE "WorkoutExerciseSet" ADD COLUMN     "distanceMeters" DOUBLE PRECISION,
ADD COLUMN     "timeSeconds" INTEGER;
