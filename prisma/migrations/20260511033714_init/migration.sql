-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classroomKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "classroomId" TEXT NOT NULL,
    "studentKey" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "StudentMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "classroomId" TEXT NOT NULL,
    "adminKey" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "AdminMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "lastExerciseIndex" INTEGER NOT NULL DEFAULT 0,
    "lastChallengeIndex" INTEGER NOT NULL DEFAULT 0,
    "lastMode" TEXT NOT NULL DEFAULT 'exercises',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseProgress" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "answerState" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalProjectProgress" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "activeBlockIndex" INTEGER NOT NULL DEFAULT 0,
    "blocks" JSONB NOT NULL DEFAULT '{}',
    "editedHtml" TEXT,
    "editedCss" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalProjectProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeEditorState" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "exerciseIndex" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeEditorState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_classroomKey_key" ON "Classroom"("classroomKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMembership_userId_classroomId_key" ON "StudentMembership"("userId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMembership_classroomId_studentKey_key" ON "StudentMembership"("classroomId", "studentKey");

-- CreateIndex
CREATE UNIQUE INDEX "AdminMembership_userId_classroomId_key" ON "AdminMembership"("userId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminMembership_classroomId_adminKey_key" ON "AdminMembership"("classroomId", "adminKey");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_membershipId_lessonId_key" ON "LessonProgress"("membershipId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseProgress_membershipId_lessonId_exerciseIndex_key" ON "ExerciseProgress"("membershipId", "lessonId", "exerciseIndex");

-- CreateIndex
CREATE UNIQUE INDEX "FinalProjectProgress_membershipId_lessonId_key" ON "FinalProjectProgress"("membershipId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeEditorState_membershipId_lessonId_exerciseIndex_key" ON "CodeEditorState"("membershipId", "lessonId", "exerciseIndex");

-- AddForeignKey
ALTER TABLE "StudentMembership" ADD CONSTRAINT "StudentMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMembership" ADD CONSTRAINT "StudentMembership_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminMembership" ADD CONSTRAINT "AdminMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminMembership" ADD CONSTRAINT "AdminMembership_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseProgress" ADD CONSTRAINT "ExerciseProgress_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalProjectProgress" ADD CONSTRAINT "FinalProjectProgress_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeEditorState" ADD CONSTRAINT "CodeEditorState_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StudentMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
