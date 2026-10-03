-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "maxReps" INTEGER,
ADD COLUMN     "repsOnly" BOOLEAN NOT NULL DEFAULT false;
