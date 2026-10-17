-- Run once if not using scripts/db-sync.js alter sync.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
