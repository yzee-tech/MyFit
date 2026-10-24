-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "assisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "machineUnit" "WeightUnit",
ADD COLUMN     "machineWeights" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- BEGIN DATA MIGRATION
-- An assisted machine moves from its weight set onto its exercise: its weights and unit, and assisted.
-- Only exercises whose routines link exactly one assistance set, that aren't reps only and have no levels;
-- the bodyweight share stays as it is. Nothing else moves
CREATE TEMP TABLE "_MovedMachine" AS
SELECT t."exerciseId", min(ws."id") AS "weightSetId"
FROM "ExerciseTemplate" t
JOIN "WeightSet" ws ON ws."id" = t."weightSetId"
JOIN "Exercise" e ON e."id" = t."exerciseId"
WHERE ws."isAssistance" AND ws."unit" IN ('KG', 'LB') AND cardinality(ws."weights") > 0
  AND t."exerciseId" IS NOT NULL AND NOT e."repsOnly" AND e."levelsFrom" IS NULL
GROUP BY t."exerciseId"
HAVING count(DISTINCT ws."id") = 1;

UPDATE "Exercise" e
SET "machineWeights" = ws."weights", "machineUnit" = ws."unit", "assisted" = true
FROM "_MovedMachine" m JOIN "WeightSet" ws ON ws."id" = m."weightSetId"
WHERE e."id" = m."exerciseId";

-- The machine's weights now come from the exercise: its routine links (to any weight set) would only mislead
UPDATE "ExerciseTemplate" SET "weightSetId" = NULL
WHERE "exerciseId" IN (SELECT "exerciseId" FROM "_MovedMachine");

-- A moved set goes once nothing else uses it: no routine link left, and no workout of an exercise that stayed
CREATE TEMP TABLE "_GoneWeightSet" AS
SELECT DISTINCT m."weightSetId" AS "id"
FROM "_MovedMachine" m
WHERE NOT EXISTS (SELECT 1 FROM "ExerciseTemplate" t WHERE t."weightSetId" = m."weightSetId")
  AND NOT EXISTS (
    SELECT 1 FROM "WorkoutExercise" we
    WHERE we."weightSetId" = m."weightSetId"
      AND (we."exerciseId" IS NULL OR we."exerciseId" NOT IN (SELECT "exerciseId" FROM "_MovedMachine"))
  );

UPDATE "WorkoutExercise" SET "weightSetId" = NULL WHERE "weightSetId" IN (SELECT "id" FROM "_GoneWeightSet");
DELETE FROM "WeightSet" WHERE "id" IN (SELECT "id" FROM "_GoneWeightSet");
DROP TABLE "_MovedMachine";
DROP TABLE "_GoneWeightSet";
-- END DATA MIGRATION
