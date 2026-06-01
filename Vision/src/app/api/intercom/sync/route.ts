import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; // server-only; bypasses RLS
import { pstDateString } from '@/lib/intercom';
import { computeDayMetrics, toEmailRow, toOpsMetricRows } from '@/lib/sla-metrics';

// The reporting export is async (enqueue -> poll); give the route room to finish.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const TOKEN = process.env.INTERCOM_API_TOKEN;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    if (!TOKEN) return NextResponse.json({ error: 'Missing INTERCOM_API_TOKEN' }, { status: 500 });

    // Date: ?date=YYYY-MM-DD or JSON body { date }, defaulting to today (PST).
    const url = new URL(req.url);
    let date = url.searchParams.get('date') || undefined;
    if (!date) {
      const body = await req.json().catch(() => null);
      if (body?.date) date = String(body.date);
    }
    if (!date) date = pstDateString();
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: `Invalid date '${date}', expected YYYY-MM-DD` }, { status: 400 });
    }

    console.log(`[intercom-sync] computing metrics for ${date} (PST)…`);
    const metrics = await computeDayMetrics(date);

    // Upsert ONLY the channels whose source export succeeded this run.
    // toOpsMetricRows already drops the channels flagged not-ok, so a transient
    // export failure leaves the last-good row intact instead of zeroing it.
    const opsRows = toOpsMetricRows(metrics);
    const skipped: string[] = [];
    if (!metrics.ok.voice) skipped.push('voice');
    if (!metrics.ok.chat) skipped.push('chat');
    if (opsRows.length) {
      const { error: opsErr } = await supabase
        .from('ops_metrics')
        .upsert(opsRows, { onConflict: 'department,channel,date' });
      if (opsErr) throw new Error(`ops_metrics upsert: ${opsErr.message}`);
    }

    // Upsert the email row only when trustworthy (see ok.email) — never overwrite
    // a real closed count with a transient 0.
    if (metrics.ok.email) {
      const { error: emailErr } = await supabase
        .from('email_productivity')
        .upsert(toEmailRow(metrics), { onConflict: 'date' });
      if (emailErr) console.error('[intercom-sync] email_productivity upsert failed:', emailErr.message);
    } else {
      skipped.push('email');
    }
    if (skipped.length) console.warn(`[intercom-sync] ${date}: kept last-good (source failed) for: ${skipped.join(', ')}`);

    console.log(`[intercom-sync] ✅ ${date}`, JSON.stringify(metrics.diagnostics));
    return NextResponse.json({
      status: 'success',
      date,
      voice: metrics.voice,
      chat: metrics.chat,
      email: metrics.email,
      ok: metrics.ok,
      keptLastGood: skipped, // channels whose source failed; prior DB values preserved
      diagnostics: metrics.diagnostics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[intercom-sync] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
