-- CreateEnum
CREATE TYPE "PerfumeSubmissionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "perfume_submissions" (
    "id" TEXT NOT NULL,
    "status" "PerfumeSubmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "checkReport" JSONB,
    "unresolvedEntities" JSONB,
    "adminOverrides" JSONB,
    "confidence" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "resolvedBrandId" TEXT,
    "materializedPerfumeId" TEXT,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "perfume_submissions_status_createdAt_idx" ON "perfume_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "perfume_submissions_submittedById_idx" ON "perfume_submissions"("submittedById");
