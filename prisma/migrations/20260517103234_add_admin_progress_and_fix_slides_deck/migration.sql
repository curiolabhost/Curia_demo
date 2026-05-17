-- DropIndex
DROP INDEX "SlidesDeck_classroomId_lessonId_instructorUserId_key";

-- AlterTable
ALTER TABLE "SlidesDeck" DROP COLUMN "instructorUserId",
ADD COLUMN     "lastEditedByUserId" TEXT;

-- CreateTable
CREATE TABLE "AdminLessonProgress" (
    "id" TEXT NOT NULL,
    "adminMembershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "lastExerciseIndex" INTEGER NOT NULL DEFAULT 0,
    "lastChallengeIndex" INTEGER NOT NULL DEFAULT 0,
    "lastMode" TEXT NOT NULL DEFAULT 'exercises',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminExerciseProgress" (
    "id" TEXT NOT NULL,
    "adminMembershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "answerState" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminExerciseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCodeEditorState" (
    "id" TEXT NOT NULL,
    "adminMembershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCodeEditorState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminFinalProjectProgress" (
    "id" TEXT NOT NULL,
    "adminMembershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "activeBlockIndex" INTEGER NOT NULL DEFAULT 0,
    "blocks" JSONB NOT NULL DEFAULT '{}',
    "editedHtml" TEXT,
    "editedCss" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminFinalProjectProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminLessonProgress_adminMembershipId_lessonId_key" ON "AdminLessonProgress"("adminMembershipId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminExerciseProgress_adminMembershipId_lessonId_exerciseIn_key" ON "AdminExerciseProgress"("adminMembershipId", "lessonId", "exerciseIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCodeEditorState_adminMembershipId_lessonId_exerciseInd_key" ON "AdminCodeEditorState"("adminMembershipId", "lessonId", "exerciseIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AdminFinalProjectProgress_adminMembershipId_lessonId_key" ON "AdminFinalProjectProgress"("adminMembershipId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "SlidesDeck_classroomId_lessonId_key" ON "SlidesDeck"("classroomId", "lessonId");

-- AddForeignKey
ALTER TABLE "AdminLessonProgress" ADD CONSTRAINT "AdminLessonProgress_adminMembershipId_fkey" FOREIGN KEY ("adminMembershipId") REFERENCES "AdminMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminExerciseProgress" ADD CONSTRAINT "AdminExerciseProgress_adminMembershipId_fkey" FOREIGN KEY ("adminMembershipId") REFERENCES "AdminMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCodeEditorState" ADD CONSTRAINT "AdminCodeEditorState_adminMembershipId_fkey" FOREIGN KEY ("adminMembershipId") REFERENCES "AdminMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminFinalProjectProgress" ADD CONSTRAINT "AdminFinalProjectProgress_adminMembershipId_fkey" FOREIGN KEY ("adminMembershipId") REFERENCES "AdminMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
