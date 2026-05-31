import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Intercom SLA data will not be available.');
}

/**
 * Public (anon) client — used in the BROWSER for reads + realtime. With RLS on,
 * it can only SELECT the dashboard tables (policies in scripts/rls-policies.sql)
 * and cannot write or read private tables (users / staff / agent_status_log).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-only client using the SERVICE ROLE key — BYPASSES RLS. Used by API
 * routes / server libs for all WRITES and for reading private tables (users).
 * NEVER import this into a client component (the key must never reach the browser).
 * Falls back to the anon key if the service-role key isn't set yet (works only
 * while RLS is still disabled — set SUPABASE_SERVICE_ROLE_KEY before enabling RLS).
 */
if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set — server writes fall back to the anon key (this only works while RLS is DISABLED).');
}
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
