-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "levelStep" DOUBLE PRECISION,
ADD COLUMN     "levelsFrom" DOUBLE PRECISION,
ADD COLUMN     "levelsTo" DOUBLE PRECISION;

-- BEGIN DATA MIGRATION
-- A machine's levels move from its weight set onto its exercise: lowest, highest, and a step of 0.5
-- when any two levels are less than 1 apart, else 1. An exercise linked to more than one level set
-- takes the first by id; reps-only exercises never use loads, so they take none
WITH "LevelSet" AS (
  SELECT ws."id",
         (SELECT min(w) FROM unnest(ws."weights") w) AS "lo",
         (SELECT max(w) FROM unnest(ws."weights") w) AS "hi",
         (SELECT min(g."gap") FROM (SELECT w - lag(w) OVER (ORDER BY w) AS "gap" FROM unnest(ws."weights") w) g
          WHERE g."gap" > 0) AS "gap"
  FROM "WeightSet" ws
  WHERE ws."unit" = 'LEVEL' AND cardinality(ws."weights") > 0
),
"Link" AS (
  SELECT "exerciseId", "weightSetId" FROM "ExerciseTemplate"
  UNION SELECT "exerciseId", "weightSetId" FROM "MesocycleExerciseTemplate"
  UNION SELECT "exerciseId", "weightSetId" FROM "WorkoutExercise"
),
"Picked" AS (
  SELECT DISTINCT ON (l."exerciseId") l."exerciseId", s."lo", s."hi", s."gap"
  FROM "Link" l JOIN "LevelSet" s ON s."id" = l."weightSetId"
  WHERE l."exerciseId" IS NOT NULL
  ORDER BY l."exerciseId", s."id"
)
UPDATE "Exercise" e
SET "levelsFrom" = p."lo",
    "levelsTo" = p."hi",
    "levelStep" = CASE WHEN p."gap" < 1 THEN 0.5 ELSE 1 END
FROM "Picked" p
WHERE e."id" = p."exerciseId" AND NOT e."repsOnly" AND e."levelsFrom" IS NULL;

-- Level sets go: links to them are cleared, and the sets deleted (used or not)
UPDATE "ExerciseTemplate" SET "weightSetId" = NULL
WHERE "weightSetId" IN (SELECT "id" FROM "WeightSet" WHERE "unit" = 'LEVEL');
UPDATE "MesocycleExerciseTemplate" SET "weightSetId" = NULL
WHERE "weightSetId" IN (SELECT "id" FROM "WeightSet" WHERE "unit" = 'LEVEL');
UPDATE "WorkoutExercise" SET "weightSetId" = NULL
WHERE "weightSetId" IN (SELECT "id" FROM "WeightSet" WHERE "unit" = 'LEVEL');
DELETE FROM "WeightSet" WHERE "unit" = 'LEVEL';
-- END DATA MIGRATION
