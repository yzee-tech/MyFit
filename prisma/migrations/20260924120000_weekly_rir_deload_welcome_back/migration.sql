-- Blocks: one target RIR per week instead of "weeks per RIR level".
-- RIRProgression[i] was the number of weeks at RIR i (index 0 = 0 RIR), done from the highest RIR down.
ALTER TABLE "Mesocycle" ADD COLUMN "weeklyRIR" INTEGER[];

UPDATE "Mesocycle" AS m
SET "weeklyRIR" = COALESCE(
    (
        SELECT array_agg(levels.rir ORDER BY levels.rir DESC)
        FROM (
            SELECT (progression.idx - 1)::INTEGER AS rir
            FROM unnest(m."RIRProgression") WITH ORDINALITY AS progression(weeks, idx)
            CROSS JOIN LATERAL generate_series(1, progression.weeks)
        ) AS levels
    ),
    ARRAY[]::INTEGER[]
);

ALTER TABLE "Mesocycle" DROP COLUMN "RIRProgression";

-- Workouts done in a deload week are not used as the baseline for progression
ALTER TABLE "Workout" ADD COLUMN "isDeload" BOOLEAN NOT NULL DEFAULT false;

-- Welcome-back rule
ALTER TABLE "UserSettings" ADD COLUMN "welcomeBackEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "welcomeBackAfterDays" INTEGER NOT NULL DEFAULT 7;
