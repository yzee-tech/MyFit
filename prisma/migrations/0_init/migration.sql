-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('Chest', 'FrontDelts', 'SideDelts', 'RearDelts', 'Lats', 'Traps', 'Triceps', 'Biceps', 'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Neck', 'Adductors', 'Abductors', 'Custom');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('Straight', 'V2', 'Drop', 'Down', 'Myorep', 'MyorepMatch', 'MyorepMatchDown', 'TopBackoff');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('Percentage', 'AbsoluteLoad');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('Skipped', 'RestDay');

-- CreateEnum
CREATE TYPE "QuotesDisplayMode" AS ENUM ('PRE_WORKOUT', 'POST_WORKOUT', 'BETWEEN_SETS');

-- CreateTable
CREATE TABLE "ExerciseSplit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExerciseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSplitDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "isRestDay" BOOLEAN NOT NULL,
    "exerciseSplitId" TEXT NOT NULL,

    CONSTRAINT "ExerciseSplitDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "targetMuscleGroup" "MuscleGroup" NOT NULL,
    "customMuscleGroup" TEXT,
    "bodyweightFraction" DOUBLE PRECISION,
    "setType" "SetType" NOT NULL,
    "repRangeStart" INTEGER NOT NULL,
    "repRangeEnd" INTEGER NOT NULL,
    "changeType" "ChangeType",
    "changeAmount" DOUBLE PRECISION,
    "note" TEXT,
    "exerciseSplitDayId" TEXT NOT NULL,
    "topRepRangeStart" INTEGER,
    "topRepRangeEnd" INTEGER,

    CONSTRAINT "ExerciseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesocycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseSplitId" TEXT,
    "RIRProgression" INTEGER[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "startOverloadPercentage" DOUBLE PRECISION NOT NULL,
    "lastSetToFailure" BOOLEAN NOT NULL,
    "forceRIRMatching" BOOLEAN NOT NULL,

    CONSTRAINT "Mesocycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesocycleCyclicSetChange" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "customMuscleGroup" TEXT,
    "regardlessOfProgress" BOOLEAN NOT NULL,
    "setIncreaseAmount" INTEGER NOT NULL,
    "maxVolume" INTEGER NOT NULL,

    CONSTRAINT "MesocycleCyclicSetChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesocycleExerciseSplitDay" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "isRestDay" BOOLEAN NOT NULL,
    "mesocycleId" TEXT NOT NULL,

    CONSTRAINT "MesocycleExerciseSplitDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesocycleExerciseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "targetMuscleGroup" "MuscleGroup" NOT NULL,
    "customMuscleGroup" TEXT,
    "bodyweightFraction" DOUBLE PRECISION,
    "sets" INTEGER NOT NULL,
    "setType" "SetType" NOT NULL,
    "repRangeStart" INTEGER NOT NULL,
    "repRangeEnd" INTEGER NOT NULL,
    "changeType" "ChangeType",
    "changeAmount" DOUBLE PRECISION,
    "note" TEXT,
    "mesocycleExerciseSplitDayId" TEXT NOT NULL,
    "overloadPercentage" DOUBLE PRECISION,
    "lastSetToFailure" BOOLEAN,
    "forceRIRMatching" BOOLEAN,
    "minimumWeightChange" DOUBLE PRECISION,
    "topRepRangeStart" INTEGER,
    "topRepRangeEnd" INTEGER,

    CONSTRAINT "MesocycleExerciseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "migratedFromV2" BOOLEAN,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motivationalQuotesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quotesDisplayModes" "QuotesDisplayMode"[] DEFAULT ARRAY['PRE_WORKOUT']::"QuotesDisplayMode"[],

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutOfMesocycle" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "splitDayIndex" INTEGER NOT NULL,
    "workoutStatus" "WorkoutStatus",

    CONSTRAINT "WorkoutOfMesocycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "userBodyweight" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "targetMuscleGroup" "MuscleGroup" NOT NULL,
    "customMuscleGroup" TEXT,
    "bodyweightFraction" DOUBLE PRECISION,
    "setType" "SetType" NOT NULL,
    "changeType" "ChangeType",
    "changeAmount" DOUBLE PRECISION,
    "repRangeStart" INTEGER NOT NULL,
    "repRangeEnd" INTEGER NOT NULL,
    "note" TEXT,
    "overloadPercentage" DOUBLE PRECISION,
    "lastSetToFailure" BOOLEAN,
    "forceRIRMatching" BOOLEAN,
    "minimumWeightChange" DOUBLE PRECISION,
    "topRepRangeStart" INTEGER,
    "topRepRangeEnd" INTEGER,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExerciseSet" (
    "id" TEXT NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "load" DOUBLE PRECISION NOT NULL,
    "RIR" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL,

    CONSTRAINT "WorkoutExerciseSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExerciseMiniSet" (
    "id" TEXT NOT NULL,
    "miniSetIndex" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "load" DOUBLE PRECISION NOT NULL,
    "RIR" INTEGER NOT NULL,
    "workoutExerciseSetId" TEXT NOT NULL,

    CONSTRAINT "WorkoutExerciseMiniSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutOfMesocycle_workoutId_key" ON "WorkoutOfMesocycle"("workoutId");

-- AddForeignKey
ALTER TABLE "ExerciseSplit" ADD CONSTRAINT "ExerciseSplit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSplitDay" ADD CONSTRAINT "ExerciseSplitDay_exerciseSplitId_fkey" FOREIGN KEY ("exerciseSplitId") REFERENCES "ExerciseSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTemplate" ADD CONSTRAINT "ExerciseTemplate_exerciseSplitDayId_fkey" FOREIGN KEY ("exerciseSplitDayId") REFERENCES "ExerciseSplitDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesocycle" ADD CONSTRAINT "Mesocycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesocycle" ADD CONSTRAINT "Mesocycle_exerciseSplitId_fkey" FOREIGN KEY ("exerciseSplitId") REFERENCES "ExerciseSplit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesocycleCyclicSetChange" ADD CONSTRAINT "MesocycleCyclicSetChange_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesocycleExerciseSplitDay" ADD CONSTRAINT "MesocycleExerciseSplitDay_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesocycleExerciseTemplate" ADD CONSTRAINT "MesocycleExerciseTemplate_mesocycleExerciseSplitDayId_fkey" FOREIGN KEY ("mesocycleExerciseSplitDayId") REFERENCES "MesocycleExerciseSplitDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutOfMesocycle" ADD CONSTRAINT "WorkoutOfMesocycle_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutOfMesocycle" ADD CONSTRAINT "WorkoutOfMesocycle_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExerciseSet" ADD CONSTRAINT "WorkoutExerciseSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExerciseMiniSet" ADD CONSTRAINT "WorkoutExerciseMiniSet_workoutExerciseSetId_fkey" FOREIGN KEY ("workoutExerciseSetId") REFERENCES "WorkoutExerciseSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

