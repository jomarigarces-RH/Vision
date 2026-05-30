import { NextResponse } from 'next/server';
import { pollBehavior, pollBehaviorRange } from '@/lib/behavior';
import { pstDayRange } from '@/lib/intercom';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Poll missed/declined calls into behavior_events.
 *  - GET                -> cached recent-window poll (client polls this on an interval)
 *  - GET ?force=1       -> bypass cache
 *  - GET ?date=YYYY-MM-DD -> backfill a whole PST day (for the report)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const force = url.searchParams.get('force') === '1';
  try {
    if (date) {
      const { start, end } = pstDayRange(date);
      return NextResponse.json(await pollBehaviorRange(start, end));
    }
    return NextResponse.json(await pollBehavior(force));
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
