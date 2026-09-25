-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "weightSetId" TEXT;

-- AlterTable
ALTER TABLE "MesocycleExerciseTemplate" ADD COLUMN     "weightSetId" TEXT;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "weightSetId" TEXT;

-- CreateTable
CREATE TABLE "WeightSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "WeightUnit" NOT NULL,
    "weights" DOUBLE PRECISION[],
    "userId" TEXT NOT NULL,

    CONSTRAINT "WeightSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightSet_userId_idx" ON "WeightSet"("userId");

-- AddForeignKey
ALTER TABLE "WeightSet" ADD CONSTRAINT "WeightSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

