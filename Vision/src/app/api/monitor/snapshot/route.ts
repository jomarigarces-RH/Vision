import { NextResponse } from 'next/server';
import { getMonitorSnapshot } from '@/lib/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Client-facing monitoring snapshot. GET returns the in-memory-cached snapshot
 * (heavy Intercom work runs at most once per TTL window across all callers);
 * `?force=1` recomputes. The browser renders agents/queue straight from this
 * JSON, so it never reads the big tables out of Supabase.
 */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get('force') === '1';
  try {
    const snap = await getMonitorSnapshot(force);
    return NextResponse.json(snap);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
