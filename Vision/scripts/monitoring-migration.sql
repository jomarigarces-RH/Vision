-- ===========================================================================
-- Vision — Agent Monitoring (Step 2) schema
-- Run this once in the Supabase SQL editor.
-- Tables are created without RLS (matches the existing ops_metrics pattern,
-- so the anon key used by the API routes can read/write).
-- ===========================================================================

-- Live presence + workload, one row per agent (current snapshot).
CREATE TABLE IF NOT EXISTS agent_state (
  teammate_id   TEXT PRIMARY KEY,           -- Intercom admin id
  name          TEXT,
  email         TEXT,
  presence      TEXT DEFAULT 'offline',     -- online | away | offline
  away_reason   TEXT,                        -- "Break", "Lunch", "Done for the day", null
  away_since    TIMESTAMPTZ,
  channel       TEXT,                        -- voice | messaging | both | null
  channel_auto  BOOLEAN,                     -- false => agent set it manually
  lob           TEXT,                        -- derived from their open work / roster
  calls_open    INTEGER DEFAULT 0,
  chats_open    INTEGER DEFAULT 0,
  emails_open   INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Append-only status change log (powers adherence / shrinkage = time per reason).
CREATE TABLE IF NOT EXISTS agent_status_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teammate_id  TEXT NOT NULL,
  name         TEXT,
  event_type   TEXT NOT NULL,                -- away_on | away_off | channel_change | login | logout
  away_reason  TEXT,
  channel      TEXT,
  auto_changed BOOLEAN,
  at           TIMESTAMPTZ NOT NULL,
  date         DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_log_date ON agent_status_log(date);
CREATE INDEX IF NOT EXISTS idx_status_log_agent ON agent_status_log(teammate_id, at);

-- Open conversations (live workload + queue). Kept current via webhooks/reconcile.
CREATE TABLE IF NOT EXISTS live_conversations (
  conversation_id TEXT PRIMARY KEY,
  channel         TEXT,                       -- Voice | Chat | Email | SMS
  team_name       TEXT,
  lob             TEXT,                        -- support | sales | serviceRecovery | specialty | spanish | null
  assignee_id     TEXT,                        -- admin id, or null = unassigned / in queue
  assignee_name   TEXT,
  state           TEXT,                        -- open | closed | snoozed
  customer_name   TEXT,
  created_at_ic   TIMESTAMPTZ,                 -- conversation created (≈ queue entry)
  assigned_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_state ON live_conversations(state);
CREATE INDEX IF NOT EXISTS idx_live_assignee ON live_conversations(assignee_id);
CREATE INDEX IF NOT EXISTS idx_live_lob_chan ON live_conversations(lob, channel);

-- Behavior events — feeds the alert sidebar (is_alert=true) AND the reporting dashboard (all rows).
CREATE TABLE IF NOT EXISTS behavior_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teammate_id     TEXT,
  teammate_name   TEXT,
  lob             TEXT,
  behavior        TEXT NOT NULL,              -- missed_call | declined_call | unassigned | no_action_timeout | channel_change
  conversation_id TEXT,                        -- the "Contact ID"
  call_id         TEXT,
  customer_name   TEXT,
  workload_calls  INTEGER,
  workload_chats  INTEGER,
  workload_emails INTEGER,
  is_alert        BOOLEAN DEFAULT false,       -- violates policy => shows in the live feed
  detail          TEXT,
  at              TIMESTAMPTZ NOT NULL,
  date            DATE NOT NULL,
  dedup_key       TEXT UNIQUE,                 -- prevents double-recording on re-poll
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_behavior_date ON behavior_events(date);
CREATE INDEX IF NOT EXISTS idx_behavior_agent ON behavior_events(teammate_name);
CREATE INDEX IF NOT EXISTS idx_behavior_type ON behavior_events(behavior);
CREATE INDEX IF NOT EXISTS idx_behavior_alert ON behavior_events(is_alert, at);

-- Realtime so open dashboards update instantly (ignore errors if already added).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agent_state;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE behavior_events;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE agent_status_log;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
