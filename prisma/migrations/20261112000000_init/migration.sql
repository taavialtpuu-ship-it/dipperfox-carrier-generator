-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'intake',
    "initialInput" TEXT,
    "carrierType" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "variant" TEXT,
    "identityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "unitSystem" TEXT NOT NULL DEFAULT 'metric',
    "intendedWork" TEXT,
    "ruleSetVersion" TEXT,
    "researchId" TEXT,
    "questionsAsked" INTEGER NOT NULL DEFAULT 0,
    "researchRuns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSpecification" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "valueCanonical" DOUBLE PRECISION,
    "valueText" TEXT,
    "enteredValue" TEXT,
    "enteredUnit" TEXT,
    "origin" TEXT NOT NULL,
    "evidenceSourceId" TEXT,
    "configurationNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineResearch" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "carrierType" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "summary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "refreshStartedAt" TIMESTAMP(3),
    "searchesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineResearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceSource" (
    "id" TEXT NOT NULL,
    "researchId" TEXT,
    "origin" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "publisher" TEXT,
    "locator" TEXT,
    "excerpt" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecCandidate" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "valueCanonical" DOUBLE PRECISION,
    "valueText" TEXT,
    "originalValue" TEXT NOT NULL,
    "originalUnit" TEXT,
    "meaning" TEXT,
    "appliesTo" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "evidenceSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "cuttingDiameterMm" DOUBLE PRECISION,
    "grindingDepthMm" DOUBLE PRECISION,
    "massKg" DOUBLE PRECISION,
    "torqueNm" DOUBLE PRECISION,
    "suitability" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRuleSet" (
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceDocument" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRuleSet_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "ProductRequirement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productRevision" TEXT,
    "carrierType" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "allowedValues" TEXT[],
    "ruleKind" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "conflictGroup" TEXT,
    "sourceRef" TEXT,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT,
    "sourceRevision" TEXT,
    "checkedAt" TIMESTAMP(3),
    "remedyKind" TEXT,
    "remedyDescription" TEXT,
    "remedySourceUrl" TEXT,
    "note" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "ruleSetVersion" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "strictStatus" TEXT NOT NULL,
    "preliminaryStatus" TEXT NOT NULL,
    "ruleSetVersion" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "missing" JSONB NOT NULL,
    "inputsSnapshot" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEnquiry" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT,
    "enquiryType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "privacyNoticeVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "appEnv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "visitorRef" TEXT,
    "assessmentRef" TEXT,
    "stage" TEXT,
    "carrierType" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "fieldKey" TEXT,
    "productId" TEXT,
    "status" TEXT,
    "props" JSONB,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "webSearches" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessmentRef" TEXT,
    "ok" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_tokenHash_key" ON "Visitor"("tokenHash");

-- CreateIndex
CREATE INDEX "Assessment_visitorId_updatedAt_idx" ON "Assessment"("visitorId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MachineSpecification_assessmentId_field_key" ON "MachineSpecification"("assessmentId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "MachineResearch_cacheKey_key" ON "MachineResearch"("cacheKey");

-- CreateIndex
CREATE INDEX "SpecCandidate_researchId_field_idx" ON "SpecCandidate"("researchId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRequirement_key_key" ON "ProductRequirement"("key");

-- CreateIndex
CREATE INDEX "ProductRequirement_productId_carrierType_parameter_status_idx" ON "ProductRequirement"("productId", "carrierType", "parameter", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_assessmentId_productId_key" ON "AssessmentResult"("assessmentId", "productId");

-- CreateIndex
CREATE INDEX "ConversationMessage_assessmentId_createdAt_idx" ON "ConversationMessage"("assessmentId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadEnquiry_createdAt_idx" ON "LeadEnquiry"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_assessmentRef_idx" ON "AnalyticsEvent"("assessmentRef");

-- CreateIndex
CREATE INDEX "AiUsage_day_idx" ON "AiUsage"("day");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "MachineResearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSpecification" ADD CONSTRAINT "MachineSpecification_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSpecification" ADD CONSTRAINT "MachineSpecification_evidenceSourceId_fkey" FOREIGN KEY ("evidenceSourceId") REFERENCES "EvidenceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSource" ADD CONSTRAINT "EvidenceSource_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "MachineResearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecCandidate" ADD CONSTRAINT "SpecCandidate_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "MachineResearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecCandidate" ADD CONSTRAINT "SpecCandidate_evidenceSourceId_fkey" FOREIGN KEY ("evidenceSourceId") REFERENCES "EvidenceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequirement" ADD CONSTRAINT "ProductRequirement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequirement" ADD CONSTRAINT "ProductRequirement_ruleSetVersion_fkey" FOREIGN KEY ("ruleSetVersion") REFERENCES "ProductRuleSet"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEnquiry" ADD CONSTRAINT "LeadEnquiry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

