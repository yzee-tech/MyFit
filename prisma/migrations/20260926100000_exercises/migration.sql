-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "exerciseId" TEXT;

-- AlterTable
ALTER TABLE "MesocycleExerciseTemplate" ADD COLUMN     "exerciseId" TEXT;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN     "exerciseId" TEXT;

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetMuscleGroup" "MuscleGroup" NOT NULL,
    "customMuscleGroup" TEXT,
    "bodyweightFraction" DOUBLE PRECISION,
    "note" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_userId_name_key" ON "Exercise"("userId", "name");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- One exercise per name per person. Its details come from the most recent use: logged
-- workouts first, then blocks, then routine libraries
WITH uses AS (
    SELECT w."userId", we."name", we."targetMuscleGroup", we."customMuscleGroup", we."bodyweightFraction",
           1 AS "source", w."startedAt" AS "usedAt"
    FROM "WorkoutExercise" we
    JOIN "Workout" w ON w."id" = we."workoutId"
    UNION ALL
    SELECT m."userId", t."name", t."targetMuscleGroup", t."customMuscleGroup", t."bodyweightFraction",
           2, COALESCE(m."startDate", '-infinity'::timestamp)
    FROM "MesocycleExerciseTemplate" t
    JOIN "MesocycleExerciseSplitDay" d ON d."id" = t."mesocycleExerciseSplitDayId"
    JOIN "Mesocycle" m ON m."id" = d."mesocycleId"
    UNION ALL
    SELECT s."userId", t."name", t."targetMuscleGroup", t."customMuscleGroup", t."bodyweightFraction",
           3, '-infinity'::timestamp
    FROM "ExerciseTemplate" t
    JOIN "ExerciseSplitDay" d ON d."id" = t."exerciseSplitDayId"
    JOIN "ExerciseSplit" s ON s."id" = d."exerciseSplitId"
)
INSERT INTO "Exercise" ("id", "name", "targetMuscleGroup", "customMuscleGroup", "bodyweightFraction", "userId")
SELECT DISTINCT ON ("userId", "name")
    'c' || replace(gen_random_uuid()::text, '-', ''), "name", "targetMuscleGroup", "customMuscleGroup",
    "bodyweightFraction", "userId"
FROM uses
ORDER BY "userId", "name", "source", "usedAt" DESC;

-- Link every use to its exercise, and give each copy the exercise's details
UPDATE "WorkoutExercise" we
SET "exerciseId" = e."id", "targetMuscleGroup" = e."targetMuscleGroup",
    "customMuscleGroup" = e."customMuscleGroup", "bodyweightFraction" = e."bodyweightFraction"
FROM "Workout" w, "Exercise" e
WHERE w."id" = we."workoutId" AND e."userId" = w."userId" AND e."name" = we."name";

UPDATE "MesocycleExerciseTemplate" t
SET "exerciseId" = e."id", "targetMuscleGroup" = e."targetMuscleGroup",
    "customMuscleGroup" = e."customMuscleGroup", "bodyweightFraction" = e."bodyweightFraction"
FROM "MesocycleExerciseSplitDay" d, "Mesocycle" m, "Exercise" e
WHERE d."id" = t."mesocycleExerciseSplitDayId" AND m."id" = d."mesocycleId"
  AND e."userId" = m."userId" AND e."name" = t."name";

UPDATE "ExerciseTemplate" t
SET "exerciseId" = e."id", "targetMuscleGroup" = e."targetMuscleGroup",
    "customMuscleGroup" = e."customMuscleGroup", "bodyweightFraction" = e."bodyweightFraction"
FROM "ExerciseSplitDay" d, "ExerciseSplit" s, "Exercise" e
WHERE d."id" = t."exerciseSplitDayId" AND s."id" = d."exerciseSplitId"
  AND e."userId" = s."userId" AND e."name" = t."name";

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTemplate" ADD CONSTRAINT "ExerciseTemplate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesocycleExerciseTemplate" ADD CONSTRAINT "MesocycleExerciseTemplate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

