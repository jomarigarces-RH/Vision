import { NextResponse } from 'next/server';
import { getMonitorSnapshot } from '@/lib/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Force a fresh snapshot from Intercom and persist it to Supabase (seeds
 * agent_state + live_conversations so webhooks have a base state, self-heals
 * drift). Manual "Refresh" and any cron should hit this. The compute itself
 * lives in src/lib/monitor.ts and is shared with the cached GET /snapshot.
 */
async function run() {
  try {
    const snap = await getMonitorSnapshot(true);
    return NextResponse.json({
      ok: true,
      agents: snap.counts.agents,
      online: snap.presence.online,
      away: snap.presence.away,
      liveConversations: snap.counts.liveConversations,
      emailBacklog: snap.emailBacklog,
      staleClosed: snap.counts.staleClosed,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST() {
  return run();
}
export async function GET() {
  return run();
}
