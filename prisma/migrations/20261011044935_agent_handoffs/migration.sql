-- CreateTable
CREATE TABLE "AgentHandoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenAt" DATETIME,
    CONSTRAINT "AgentHandoff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AgentHandoff_userId_toAgent_takenAt_idx" ON "AgentHandoff"("userId", "toAgent", "takenAt");
