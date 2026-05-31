-- ===========================================================================
-- Vision — Enable Row Level Security (RLS)
--
-- MODEL:
--   • The BROWSER uses the public anon key and may only SELECT the dashboard
--     tables (read-only). It can never write, and cannot touch private tables.
--   • The SERVER (API routes) uses the SERVICE ROLE key, which BYPASSES RLS, so
--     all writes + reads of private tables keep working.
--
-- ⚠️ ORDER OF ROLLOUT (do NOT run this first):
--   1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local AND Vercel
--      (Supabase → Project Settings → API → service_role key).
--   2. Deploy the app (server writes now use the service-role client).
--   3. THEN run this script. (If you run it before step 1-2, all writes break.)
--
-- Safe to re-run (DROP POLICY IF EXISTS).
-- ===========================================================================

-- ---- Read-only dashboard tables: anon may SELECT (powers the UI + realtime) --
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ops_metrics', 'email_productivity', 'absenteeism', 'ops_log',
    'agent_state', 'live_conversations', 'behavior_events'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'anon_read_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);',
        'anon_read_' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- ---- Private tables: RLS on, NO anon policy. Only the service-role server can
-- ---- read/write them (it bypasses RLS). Protects passwords, roster, raw logs. --
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'staff', 'agent_status_log'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      -- intentionally no policy => anon/authenticated get zero access
    END IF;
  END LOOP;
END $$;

-- Verify (optional): SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('ops_metrics','agent_state','behavior_events','users','staff');
