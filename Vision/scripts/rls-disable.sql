-- ===========================================================================
-- Vision — EMERGENCY ROLLBACK: disable RLS (restores the pre-RLS working state)
-- Use this only if you enabled RLS before setting SUPABASE_SERVICE_ROLE_KEY and
-- need the tool working again immediately. Re-run scripts/rls-policies.sql once
-- the service-role key is set + deployed.
-- ===========================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ops_metrics', 'email_productivity', 'absenteeism', 'ops_log',
    'agent_state', 'live_conversations', 'behavior_events',
    'users', 'staff', 'agent_status_log'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;
