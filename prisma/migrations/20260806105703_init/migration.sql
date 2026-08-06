-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShelfKind" AS ENUM ('HAVE', 'HAD', 'WANT', 'WANT_TO_TRY', 'FAVORITES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PyramidLevel" AS ENUM ('TOP', 'HEART', 'BASE');

-- CreateEnum
CREATE TYPE "ScaleMetric" AS ENUM ('GENDER', 'LONGEVITY', 'SILLAGE', 'VALUE');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('REMINDS_ME_OF', 'ALSO_LIKES');

-- CreateEnum
CREATE TYPE "VoteDirection" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PENDING_REVIEW', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'ENTITY_RESOLVED', 'REQUIREMENTS_PASSED', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "SubmissionEntityType" AS ENUM ('PERFUME', 'BRAND', 'NOTE', 'PERFUMER', 'ACCORD');

-- CreateEnum
CREATE TYPE "AccordSource" AS ENUM ('MANUAL', 'COMPUTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfumers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfumers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfumes" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "collectionId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "storeUrl" TEXT,
    "releaseYear" INTEGER,
    "discontinued" BOOLEAN NOT NULL DEFAULT false,
    "discontinuationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_perfumers" (
    "perfumeId" TEXT NOT NULL,
    "perfumerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PERFUMER',

    CONSTRAINT "perfume_perfumers_pkey" PRIMARY KEY ("perfumeId","perfumerId")
);

-- CreateTable
CREATE TABLE "perfume_reformulations" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "year" INTEGER,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_reformulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_aliases" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_notes" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "level" "PyramidLevel" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "perfume_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accords" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_accords" (
    "accordId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "note_accords_pkey" PRIMARY KEY ("accordId","noteId")
);

-- CreateTable
CREATE TABLE "perfume_accords" (
    "perfumeId" TEXT NOT NULL,
    "accordId" TEXT NOT NULL,
    "source" "AccordSource" NOT NULL DEFAULT 'MANUAL',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfume_accords_pkey" PRIMARY KEY ("perfumeId","accordId")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ShelfKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_items" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "shelf_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_relations" (
    "id" TEXT NOT NULL,
    "sourcePerfumeId" TEXT NOT NULL,
    "targetPerfumeId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_relation_votes" (
    "id" TEXT NOT NULL,
    "relationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "VoteDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_relation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_votes" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "VoteDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_scale_votes" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" "ScaleMetric" NOT NULL,
    "bucket" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_scale_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfume_scale_histograms" (
    "id" TEXT NOT NULL,
    "perfumeId" TEXT NOT NULL,
    "metric" "ScaleMetric" NOT NULL,
    "buckets" JSONB NOT NULL DEFAULT '{}',
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfume_scale_histograms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_queue" (
    "id" TEXT NOT NULL,
    "entityType" "SubmissionEntityType" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rawPayload" JSONB NOT NULL,
    "resolvedPayload" JSONB,
    "entityResolution" JSONB,
    "missingRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejectionReason" TEXT,
    "resolvedEntityId" TEXT,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "entityResolvedAt" TIMESTAMP(3),
    "requirementsVerifiedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands"("name");

-- CreateIndex
CREATE INDEX "collections_brandId_name_idx" ON "collections"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "collections_brandId_slug_key" ON "collections"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "perfumers_slug_key" ON "perfumers"("slug");

-- CreateIndex
CREATE INDEX "perfumers_name_idx" ON "perfumers"("name");

-- CreateIndex
CREATE INDEX "perfumes_name_idx" ON "perfumes"("name");

-- CreateIndex
CREATE INDEX "perfumes_brandId_releaseYear_idx" ON "perfumes"("brandId", "releaseYear");

-- CreateIndex
CREATE INDEX "perfumes_discontinued_idx" ON "perfumes"("discontinued");

-- CreateIndex
CREATE UNIQUE INDEX "perfumes_brandId_slug_key" ON "perfumes"("brandId", "slug");

-- CreateIndex
CREATE INDEX "perfume_perfumers_perfumerId_idx" ON "perfume_perfumers"("perfumerId");

-- CreateIndex
CREATE INDEX "perfume_reformulations_perfumeId_year_idx" ON "perfume_reformulations"("perfumeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "notes_slug_key" ON "notes"("slug");

-- CreateIndex
CREATE INDEX "notes_canonicalName_idx" ON "notes"("canonicalName");

-- CreateIndex
CREATE INDEX "note_aliases_noteId_idx" ON "note_aliases"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "note_aliases_normalizedAlias_key" ON "note_aliases"("normalizedAlias");

-- CreateIndex
CREATE INDEX "perfume_notes_perfumeId_level_idx" ON "perfume_notes"("perfumeId", "level");

-- CreateIndex
CREATE INDEX "perfume_notes_noteId_idx" ON "perfume_notes"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "perfume_notes_perfumeId_noteId_level_key" ON "perfume_notes"("perfumeId", "noteId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "accords_slug_key" ON "accords"("slug");

-- CreateIndex
CREATE INDEX "accords_name_idx" ON "accords"("name");

-- CreateIndex
CREATE INDEX "note_accords_noteId_idx" ON "note_accords"("noteId");

-- CreateIndex
CREATE INDEX "perfume_accords_accordId_idx" ON "perfume_accords"("accordId");

-- CreateIndex
CREATE INDEX "shelves_userId_idx" ON "shelves"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shelves_userId_kind_name_key" ON "shelves"("userId", "kind", "name");

-- CreateIndex
CREATE INDEX "shelf_items_shelfId_idx" ON "shelf_items"("shelfId");

-- CreateIndex
CREATE INDEX "shelf_items_perfumeId_idx" ON "shelf_items"("perfumeId");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_items_shelfId_perfumeId_key" ON "shelf_items"("shelfId", "perfumeId");

-- CreateIndex
CREATE INDEX "perfume_relations_sourcePerfumeId_type_score_idx" ON "perfume_relations"("sourcePerfumeId", "type", "score");

-- CreateIndex
CREATE INDEX "perfume_relations_targetPerfumeId_type_idx" ON "perfume_relations"("targetPerfumeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "perfume_relations_sourcePerfumeId_targetPerfumeId_type_key" ON "perfume_relations"("sourcePerfumeId", "targetPerfumeId", "type");

-- CreateIndex
CREATE INDEX "perfume_relation_votes_userId_idx" ON "perfume_relation_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "perfume_relation_votes_relationId_userId_key" ON "perfume_relation_votes"("relationId", "userId");

-- CreateIndex
CREATE INDEX "reviews_perfumeId_status_score_idx" ON "reviews"("perfumeId", "status", "score");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX "review_votes_userId_idx" ON "review_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "review_votes_reviewId_userId_key" ON "review_votes"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "perfume_scale_votes_perfumeId_metric_idx" ON "perfume_scale_votes"("perfumeId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "perfume_scale_votes_perfumeId_userId_metric_key" ON "perfume_scale_votes"("perfumeId", "userId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "perfume_scale_histograms_perfumeId_metric_key" ON "perfume_scale_histograms"("perfumeId", "metric");

-- CreateIndex
CREATE INDEX "submission_queue_status_entityType_idx" ON "submission_queue"("status", "entityType");

-- CreateIndex
CREATE INDEX "submission_queue_submittedById_idx" ON "submission_queue"("submittedById");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfumes" ADD CONSTRAINT "perfumes_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfumes" ADD CONSTRAINT "perfumes_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_perfumers" ADD CONSTRAINT "perfume_perfumers_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_perfumers" ADD CONSTRAINT "perfume_perfumers_perfumerId_fkey" FOREIGN KEY ("perfumerId") REFERENCES "perfumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_reformulations" ADD CONSTRAINT "perfume_reformulations_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_aliases" ADD CONSTRAINT "note_aliases_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_notes" ADD CONSTRAINT "perfume_notes_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_notes" ADD CONSTRAINT "perfume_notes_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_accords" ADD CONSTRAINT "note_accords_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "accords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_accords" ADD CONSTRAINT "note_accords_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_accords" ADD CONSTRAINT "perfume_accords_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_accords" ADD CONSTRAINT "perfume_accords_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "accords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_relations" ADD CONSTRAINT "perfume_relations_sourcePerfumeId_fkey" FOREIGN KEY ("sourcePerfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_relations" ADD CONSTRAINT "perfume_relations_targetPerfumeId_fkey" FOREIGN KEY ("targetPerfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_relation_votes" ADD CONSTRAINT "perfume_relation_votes_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "perfume_relations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_relation_votes" ADD CONSTRAINT "perfume_relation_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_scale_votes" ADD CONSTRAINT "perfume_scale_votes_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_scale_votes" ADD CONSTRAINT "perfume_scale_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfume_scale_histograms" ADD CONSTRAINT "perfume_scale_histograms_perfumeId_fkey" FOREIGN KEY ("perfumeId") REFERENCES "perfumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_queue" ADD CONSTRAINT "submission_queue_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_queue" ADD CONSTRAINT "submission_queue_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
