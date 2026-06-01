-- AlterTable: LiveSession — add Pulse loop phase + server-authoritative timer
ALTER TABLE "LiveSession" ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN     "pollEndsAt" TIMESTAMP(3),
ADD COLUMN     "pollDurationSeconds" INTEGER;

-- AlterTable: LiveResponse — store chosen answer (for distribution) + computed score (for leaderboard)
ALTER TABLE "LiveResponse" ADD COLUMN     "answer" JSONB,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: LiveParticipant — lobby presence / heartbeat
CREATE TABLE "LiveParticipant" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_liveSessionId_membershipId_key" ON "LiveParticipant"("liveSessionId", "membershipId");

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveParticipant" ADD CONSTRAINT "LiveParticipant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
