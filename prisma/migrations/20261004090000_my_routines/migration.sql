-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "forceRIRMatching" BOOLEAN,
ADD COLUMN     "lastSetToFailure" BOOLEAN,
ADD COLUMN     "minimumWeightChange" DOUBLE PRECISION,
ADD COLUMN     "overloadPercentage" DOUBLE PRECISION,
ADD COLUMN     "weightUnit" "WeightUnit";

-- AlterTable
ALTER TABLE "MesocycleExerciseSplitDay" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- BEGIN DATA MIGRATION
-- One routine list per person ("My routines"). Per person:
--   1. The list to keep: the active block's library; else the library of the most recently
--      started block still linked to one; else the library with the most routines (then by name, id);
--      else, with an active block but no library, a new one. Otherwise nothing is created.
--   2. Rest days are dropped (routines aren't tied to days any more) and duplicate names in the kept
--      list get "(2)", "(3)"...
--   3. Every other library's routines move to the end of the kept list, renamed "Name (2)", "Name (3)"...
--      skipping names already taken, then the emptied libraries are deleted.
--   4. The active block's routines are what's being trained, so each one replaces the routine of the
--      same name (or is added): exercises, sets, progression overrides and kg/lb choice.
--   5. Blocks not yet finished follow the kept list; finished blocks follow none.
-- Safe to run again: a person who already has a single list and no rest days is left as they are.
CREATE OR REPLACE FUNCTION pg_temp.unique_routine_name(wanted TEXT, taken TEXT[]) RETURNS TEXT AS $$
DECLARE
    candidate TEXT := wanted;
    n INT := 2;
BEGIN
    WHILE candidate = ANY(taken) LOOP
        candidate := wanted || ' (' || n || ')';
        n := n + 1;
    END LOOP;
    RETURN candidate;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    person RECORD;
    active_block RECORD;
    target_id TEXT;
    taken TEXT[];
    next_index INT;
    other RECORD;
    routine RECORD;
    target_day_id TEXT;
    new_name TEXT;
BEGIN
    FOR person IN
        SELECT "id" FROM "User" u
        WHERE EXISTS (SELECT 1 FROM "ExerciseSplit" s WHERE s."userId" = u."id")
           OR EXISTS (SELECT 1 FROM "Mesocycle" m WHERE m."userId" = u."id" AND m."startDate" IS NOT NULL AND m."endDate" IS NULL)
    LOOP
        SELECT "id", "exerciseSplitId" INTO active_block FROM "Mesocycle"
        WHERE "userId" = person."id" AND "startDate" IS NOT NULL AND "endDate" IS NULL
        ORDER BY "startDate" DESC, "id" LIMIT 1;

        -- 1. The list to keep
        target_id := NULL;
        IF active_block."exerciseSplitId" IS NOT NULL THEN
            target_id := active_block."exerciseSplitId";
        END IF;
        IF target_id IS NULL THEN
            SELECT m."exerciseSplitId" INTO target_id FROM "Mesocycle" m
            WHERE m."userId" = person."id" AND m."exerciseSplitId" IS NOT NULL
            ORDER BY m."startDate" DESC NULLS LAST, m."id" DESC LIMIT 1;
        END IF;
        IF target_id IS NULL THEN
            SELECT s."id" INTO target_id FROM "ExerciseSplit" s
            WHERE s."userId" = person."id"
            ORDER BY (SELECT count(*) FROM "ExerciseSplitDay" d WHERE d."exerciseSplitId" = s."id" AND NOT d."isRestDay") DESC,
                     s."name", s."id"
            LIMIT 1;
        END IF;
        IF target_id IS NULL AND active_block."id" IS NOT NULL THEN
            target_id := 'c' || replace(gen_random_uuid()::text, '-', '');
            INSERT INTO "ExerciseSplit" ("id", "name", "userId") VALUES (target_id, 'My routines', person."id");
        END IF;
        CONTINUE WHEN target_id IS NULL;
        UPDATE "ExerciseSplit" SET "name" = 'My routines' WHERE "id" = target_id;

        -- 2. No rest days; unique names, in order
        DELETE FROM "ExerciseSplitDay" WHERE "exerciseSplitId" = target_id AND "isRestDay";
        taken := ARRAY[]::TEXT[];
        next_index := 0;
        FOR routine IN
            SELECT "id", "name" FROM "ExerciseSplitDay" WHERE "exerciseSplitId" = target_id ORDER BY "dayIndex", "id"
        LOOP
            new_name := pg_temp.unique_routine_name(routine."name", taken);
            UPDATE "ExerciseSplitDay" SET "name" = new_name, "dayIndex" = next_index WHERE "id" = routine."id";
            taken := taken || new_name;
            next_index := next_index + 1;
        END LOOP;

        -- 3. Other libraries' routines move to the end, then the libraries go
        FOR other IN
            SELECT s."id" FROM "ExerciseSplit" s
            WHERE s."userId" = person."id" AND s."id" <> target_id
            ORDER BY (SELECT max(m."startDate") FROM "Mesocycle" m WHERE m."exerciseSplitId" = s."id") DESC NULLS LAST,
                     s."name", s."id"
        LOOP
            FOR routine IN
                SELECT "id", "name" FROM "ExerciseSplitDay"
                WHERE "exerciseSplitId" = other."id" AND NOT "isRestDay" ORDER BY "dayIndex", "id"
            LOOP
                new_name := pg_temp.unique_routine_name(routine."name", taken);
                UPDATE "ExerciseSplitDay" SET "exerciseSplitId" = target_id, "name" = new_name, "dayIndex" = next_index
                WHERE "id" = routine."id";
                taken := taken || new_name;
                next_index := next_index + 1;
            END LOOP;
            DELETE FROM "ExerciseSplit" WHERE "id" = other."id";
        END LOOP;

        -- 4. The active block's routines, as trained
        IF active_block."id" IS NOT NULL THEN
            FOR routine IN
                SELECT "id", "name", "weightUnit" FROM "MesocycleExerciseSplitDay"
                WHERE "mesocycleId" = active_block."id" AND NOT "isRestDay" AND NOT "hidden" ORDER BY "dayIndex"
            LOOP
                SELECT "id" INTO target_day_id FROM "ExerciseSplitDay"
                WHERE "exerciseSplitId" = target_id AND "name" = routine."name" LIMIT 1;
                IF target_day_id IS NULL THEN
                    target_day_id := 'c' || replace(gen_random_uuid()::text, '-', '');
                    INSERT INTO "ExerciseSplitDay" ("id", "name", "dayIndex", "isRestDay", "weightUnit", "exerciseSplitId")
                    VALUES (target_day_id, routine."name", next_index, false, routine."weightUnit", target_id);
                    taken := taken || routine."name";
                    next_index := next_index + 1;
                ELSE
                    UPDATE "ExerciseSplitDay" SET "weightUnit" = routine."weightUnit" WHERE "id" = target_day_id;
                    DELETE FROM "ExerciseTemplate" WHERE "exerciseSplitDayId" = target_day_id;
                END IF;
                INSERT INTO "ExerciseTemplate" (
                    "id", "name", "exerciseIndex", "targetMuscleGroup", "customMuscleGroup", "bodyweightFraction",
                    "sets", "setType", "repRangeStart", "repRangeEnd", "changeType", "changeAmount", "note",
                    "exerciseSplitDayId", "topRepRangeStart", "topRepRangeEnd", "weightSetId", "exerciseId",
                    "overloadPercentage", "lastSetToFailure", "forceRIRMatching", "minimumWeightChange", "weightUnit"
                )
                SELECT 'c' || replace(gen_random_uuid()::text, '-', ''), t."name", t."exerciseIndex", t."targetMuscleGroup",
                       t."customMuscleGroup", t."bodyweightFraction", t."sets", t."setType", t."repRangeStart",
                       t."repRangeEnd", t."changeType", t."changeAmount", t."note", target_day_id, t."topRepRangeStart",
                       t."topRepRangeEnd", t."weightSetId", t."exerciseId", t."overloadPercentage", t."lastSetToFailure",
                       t."forceRIRMatching", t."minimumWeightChange", t."weightUnit"
                FROM "MesocycleExerciseTemplate" t
                WHERE t."mesocycleExerciseSplitDayId" = routine."id";
            END LOOP;
        END IF;

        -- 5. Which blocks follow the list
        UPDATE "Mesocycle" SET "exerciseSplitId" = target_id WHERE "userId" = person."id" AND "endDate" IS NULL;
        UPDATE "Mesocycle" SET "exerciseSplitId" = NULL WHERE "userId" = person."id" AND "endDate" IS NOT NULL;
    END LOOP;

    -- Finished blocks of people without a list follow none either
    UPDATE "Mesocycle" SET "exerciseSplitId" = NULL WHERE "endDate" IS NOT NULL;
END;
$$;
-- END DATA MIGRATION

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSplit_userId_key" ON "ExerciseSplit"("userId");
