-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkLessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "pathSlug" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "choices" JSONB,
    "challengeAcceptedAt" DATETIME,
    "challengeDoneAt" DATETIME,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalkLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkJournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "lessonSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalkJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "thread" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalkCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalkLife" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "data" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalkLife_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "WalkLessonProgress_userId_idx" ON "WalkLessonProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalkLessonProgress_userId_lessonSlug_key" ON "WalkLessonProgress"("userId", "lessonSlug");

-- CreateIndex
CREATE INDEX "WalkJournalEntry_userId_createdAt_idx" ON "WalkJournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalkMessage_userId_characterId_thread_createdAt_idx" ON "WalkMessage"("userId", "characterId", "thread", "createdAt");

-- CreateIndex
CREATE INDEX "WalkMessage_userId_createdAt_idx" ON "WalkMessage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalkCheckIn_userId_day_key" ON "WalkCheckIn"("userId", "day");
