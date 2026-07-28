-- AlterTable
ALTER TABLE "SopFile" ADD COLUMN     "contentHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "SopFile_contentHash_idx" ON "SopFile"("contentHash");
