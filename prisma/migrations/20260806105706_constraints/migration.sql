-- ─────────────────────────────────────────────────────────────────────────────
-- 1_constraints: DB-level guard rails not expressible in Prisma schema.
--   - Default shelves per (userId, kind): partial unique index.
--   - Scale bucket DB range: CHECK 0..4.
--   - No perfume self-relation: CHECK source <> target.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX "shelves_one_default_per_user_kind"
  ON "shelves" ("userId", "kind")
  WHERE "kind" <> 'CUSTOM';

ALTER TABLE "perfume_scale_votes"
  ADD CONSTRAINT "perfume_scale_votes_bucket_range_check"
  CHECK ("bucket" >= 0 AND "bucket" <= 4);

ALTER TABLE "perfume_relations"
  ADD CONSTRAINT "perfume_relations_no_self_relation_check"
  CHECK ("sourcePerfumeId" <> "targetPerfumeId");
