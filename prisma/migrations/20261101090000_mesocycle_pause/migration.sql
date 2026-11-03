-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "countsForProgression" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "MesocyclePause" (
    "id" TEXT NOT NULL,
    "mesocycleId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL,
    "resumedAt" TIMESTAMP(3),

    CONSTRAINT "MesocyclePause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MesocyclePause_mesocycleId_idx" ON "MesocyclePause"("mesocycleId");

-- AddForeignKey
ALTER TABLE "MesocyclePause" ADD CONSTRAINT "MesocyclePause_mesocycleId_fkey" FOREIGN KEY ("mesocycleId") REFERENCES "Mesocycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A block is paused once at a time: Prisma can't describe a partial unique index, so it is made here
-- (the server also checks inside its transaction; this is the backstop for two devices at once)
CREATE UNIQUE INDEX "MesocyclePause_one_open_per_mesocycle" ON "MesocyclePause"("mesocycleId") WHERE "resumedAt" IS NULL;
