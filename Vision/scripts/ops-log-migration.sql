-- ===========================================================================
-- Vision — ops_log: persist the Shift Operations Log so edits stay for everyone.
-- The dashboard reads `selected_items` (text[]) + `custom_notes`, and upserts one
-- row per (type, date). The original table only had a `content` column, so add
-- the columns the app expects and a unique key for the upsert. Safe to re-run.
-- ===========================================================================
ALTER TABLE ops_log ADD COLUMN IF NOT EXISTS selected_items TEXT[] DEFAULT '{}';
ALTER TABLE ops_log ADD COLUMN IF NOT EXISTS custom_notes  TEXT;
-- the legacy NOT NULL `content` column would block our inserts — relax it.
ALTER TABLE ops_log ALTER COLUMN content DROP NOT NULL;

-- collapse any pre-existing duplicates so the unique index can be created
DELETE FROM ops_log a USING ops_log b
  WHERE a.ctid < b.ctid AND a.type = b.type AND a.date = b.date;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ops_log_type_date ON ops_log(type, date);
