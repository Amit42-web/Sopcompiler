-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SopFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "version" INTEGER NOT NULL DEFAULT 1,
    "pageCount" INTEGER,
    "charCount" INTEGER,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "rawText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SopFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "version" TEXT,
    "effectiveDate" TEXT,
    "owner" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Metadata_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Section_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "sectionRef" TEXT,
    "condition" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "resolutionGroup" TEXT NOT NULL DEFAULT 'Other',
    "confidence" REAL NOT NULL DEFAULT 0.5,
    CONSTRAINT "Scenario_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "KnowledgeEntry_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Generated rule set',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleSet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "sourceScenario" TEXT,
    CONSTRAINT "Rule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "RuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleSetId" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "checkedRules" INTEGER NOT NULL,
    "issues" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationReport_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "RuleSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessingRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "scenarios" INTEGER NOT NULL DEFAULT 0,
    "rules" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessingRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcessingRun_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "projectId" TEXT,
    "fileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Activity_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "SopFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "SopFile_projectId_idx" ON "SopFile"("projectId");

-- CreateIndex
CREATE INDEX "SopFile_createdAt_idx" ON "SopFile"("createdAt");

-- CreateIndex
CREATE INDEX "SopFile_contentHash_idx" ON "SopFile"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_fileId_key" ON "Metadata"("fileId");

-- CreateIndex
CREATE INDEX "Section_fileId_idx" ON "Section"("fileId");

-- CreateIndex
CREATE INDEX "Scenario_fileId_idx" ON "Scenario"("fileId");

-- CreateIndex
CREATE INDEX "KnowledgeEntry_fileId_idx" ON "KnowledgeEntry"("fileId");

-- CreateIndex
CREATE INDEX "RuleSet_projectId_idx" ON "RuleSet"("projectId");

-- CreateIndex
CREATE INDEX "Rule_ruleSetId_idx" ON "Rule"("ruleSetId");

-- CreateIndex
CREATE INDEX "ValidationReport_ruleSetId_idx" ON "ValidationReport"("ruleSetId");

-- CreateIndex
CREATE INDEX "ProcessingRun_projectId_idx" ON "ProcessingRun"("projectId");

-- CreateIndex
CREATE INDEX "ProcessingRun_fileId_idx" ON "ProcessingRun"("fileId");

-- CreateIndex
CREATE INDEX "ProcessingRun_createdAt_idx" ON "ProcessingRun"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "Activity"("projectId");
