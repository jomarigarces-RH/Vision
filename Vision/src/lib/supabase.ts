import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isServer = typeof window === 'undefined';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Intercom SLA data will not be available.');
}

/**
 * Public (anon) client — used in the BROWSER for reads + realtime. With RLS on,
 * it can only SELECT the dashboard tables (policies in scripts/rls-policies.sql)
 * and cannot write or read private tables (users / staff / agent_status_log).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The service-role key is server-only (never NEXT_PUBLIC), so warn only on the
// server — otherwise this always fires harmlessly in the browser console.
if (isServer && !serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set — server writes fall back to the anon key (only works while RLS is DISABLED).');
}

/**
 * Server-only client using the SERVICE ROLE key — BYPASSES RLS. Used by API
 * routes / server libs for all WRITES and for reading private tables (users).
 * In the BROWSER we deliberately reuse the single anon client instead of
 * instantiating a second one — the browser never needs admin privileges, and a
 * second createClient there triggers Supabase's "Multiple GoTrueClient instances"
 * warning. NEVER rely on admin access client-side; the key isn't shipped there.
 */
export const supabaseAdmin = isServer
  ? createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : supabase;
