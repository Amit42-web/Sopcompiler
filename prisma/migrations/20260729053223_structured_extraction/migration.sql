-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "actionKind" TEXT NOT NULL DEFAULT 'business_rule',
ADD COLUMN     "appliesTo" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "branch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'business_rule',
ADD COLUMN     "conditionsTree" TEXT NOT NULL DEFAULT 'null',
ADD COLUMN     "obligation" TEXT NOT NULL DEFAULT 'mandatory',
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preconditions" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "rawText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reusableKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "validationPrompt" TEXT;

-- AlterTable
ALTER TABLE "RuleSet" ADD COLUMN     "metadataConditions" TEXT NOT NULL DEFAULT '[]';
