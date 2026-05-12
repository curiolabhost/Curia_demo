-- AlterTable
ALTER TABLE "Classroom" RENAME COLUMN "classroomKey" TO "joinCode";

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "description" TEXT,
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "StudentMembership" ADD COLUMN     "lastLessonId" TEXT;
