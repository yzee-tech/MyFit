-- AlterEnum
ALTER TYPE "WeightUnit" ADD VALUE 'LEVEL';

-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "sets" INTEGER;
