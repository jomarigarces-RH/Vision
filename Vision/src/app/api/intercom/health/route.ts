import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * Environment health check — hit this on the DEPLOYED site to diagnose why
 * Intercom calls fail in production (vs working locally). It exposes NO secret
 * values, only booleans + the token's last 4 chars (so you can confirm whether
 * Vercel has the same — current — token as your .env.local after a rotation).
 *   GET /api/intercom/health
 */
export async function GET() {
  const token = process.env.INTERCOM_API_TOKEN || '';
  const env = {
    INTERCOM_API_TOKEN: !!token,
    INTERCOM_CLIENT_SECRET: !!process.env.INTERCOM_CLIENT_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  // Live Intercom token check (GET /me).
  const intercom: { ok: boolean; status: number; app: string | null; error: string | null } = { ok: false, status: 0, app: null, error: null };
  try {
    const res = await fetch('https://api.intercom.io/me', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Intercom-Version': '2.11' },
    });
    intercom.status = res.status;
    const j = await res.json().catch(() => null);
    intercom.ok = res.ok;
    if (res.ok) intercom.app = j?.app?.name || j?.app?.id_code || null;
    else intercom.error = j?.errors?.[0]?.message || j?.message || res.statusText;
  } catch (e) {
    intercom.error = e instanceof Error ? e.message : String(e);
  }

  // Supabase reachability.
  const sb: { ok: boolean; error: string | null } = { ok: false, error: null };
  try {
    const { error } = await supabase.from('ops_metrics').select('date').limit(1);
    sb.ok = !error;
    if (error) sb.error = error.message;
  } catch (e) {
    sb.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    env,
    tokenLast4: token ? token.slice(-4) : null,
    intercom,
    supabase: sb,
    hint: !env.INTERCOM_API_TOKEN
      ? 'INTERCOM_API_TOKEN is NOT set on this deployment.'
      : !intercom.ok
        ? `Intercom rejected the token (status ${intercom.status}). Likely a stale/rotated token — update INTERCOM_API_TOKEN in Vercel to match .env.local and redeploy.`
        : 'Intercom token OK.',
  });
}
