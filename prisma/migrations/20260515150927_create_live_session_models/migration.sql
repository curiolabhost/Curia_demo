-- CreateTable
CREATE TABLE "SlidesDeck" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "instructorUserId" TEXT NOT NULL,
    "slides" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlidesDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "instructorMembershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "currentSlideType" TEXT,
    "currentSlideIndex" INTEGER,
    "currentExerciseIndex" INTEGER,
    "pollOpen" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveResponse" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlidesDeck_classroomId_lessonId_instructorUserId_key" ON "SlidesDeck"("classroomId", "lessonId", "instructorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveResponse_liveSessionId_membershipId_exerciseIndex_key" ON "LiveResponse"("liveSessionId", "membershipId", "exerciseIndex");

-- AddForeignKey
ALTER TABLE "SlidesDeck" ADD CONSTRAINT "SlidesDeck_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_instructorMembershipId_fkey" FOREIGN KEY ("instructorMembershipId") REFERENCES "AdminMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveResponse" ADD CONSTRAINT "LiveResponse_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveResponse" ADD CONSTRAINT "LiveResponse_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
