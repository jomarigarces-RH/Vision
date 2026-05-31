-- ===========================================================================
-- Vision — Agent Monitoring: performance indexes
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- Speeds up the report (by day, newest-first), the live feeds (by behavior /
-- alert, newest-first), and the snapshot's live_conversations queries.
-- ===========================================================================

-- Behavior report: WHERE date = ? ORDER BY at DESC
CREATE INDEX IF NOT EXISTS idx_behavior_date_at ON behavior_events (date, at DESC);

-- Decline Activity feed: WHERE behavior IN ('declined_call','missed_call') ORDER BY at DESC
CREATE INDEX IF NOT EXISTS idx_behavior_behavior_at ON behavior_events (behavior, at DESC);

-- Alert feed already covered by idx_behavior_alert (is_alert, at); add agent+date
-- for the report's per-agent filtering.
CREATE INDEX IF NOT EXISTS idx_behavior_agent_date ON behavior_events (teammate_name, date);

-- Snapshot persist: stale-close scans WHERE state='open' AND channel IN (...)
CREATE INDEX IF NOT EXISTS idx_live_state_channel ON live_conversations (state, channel);

-- Snapshot prune: DELETE WHERE state='closed' AND updated_at < cutoff
CREATE INDEX IF NOT EXISTS idx_live_state_updated ON live_conversations (state, updated_at);

ANALYZE behavior_events;
ANALYZE live_conversations;
