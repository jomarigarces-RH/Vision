import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; // server-only; bypasses RLS
import { pstDateString } from '@/lib/intercom';

// Post the day's SLA summary to Slack via an incoming webhook. The numbers are
// read from Supabase (whatever the dashboard last synced) so the post always
// matches the dashboard. Set SLACK_WEBHOOK_URL in .env.local AND Vercel.
export const dynamic = 'force-dynamic';

const WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Metric = {
  department: string; channel: string;
  inbound_count: number; passed_count: number; abandoned_count: number;
  frt_seconds: number; handle_seconds: number; wait_seconds: number;
};

const pct = (passed: number, inbound: number) => (inbound > 0 ? (passed / inbound) * 100 : 100);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtSecs = (s: number) => {
  s = Math.round(s || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

export async function POST(req: Request) {
  try {
    if (!WEBHOOK) return NextResponse.json({ error: 'SLACK_WEBHOOK_URL not set on the server' }, { status: 500 });

    const url = new URL(req.url);
    let date = url.searchParams.get('date') || undefined;
    if (!date) {
      const body = await req.json().catch(() => null);
      if (body?.date) date = String(body.date);
    }
    if (!date) date = pstDateString();
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Invalid date (YYYY-MM-DD)' }, { status: 400 });

    const [{ data: metrics }, { data: email }, { data: logs }] = await Promise.all([
      supabase.from('ops_metrics').select('*').eq('date', date),
      supabase.from('email_productivity').select('*').eq('date', date).maybeSingle(),
      supabase.from('ops_log').select('*').eq('date', date),
    ]);

    const rows = (metrics || []) as Metric[];
    const byDept = new Map<string, Metric[]>();
    for (const m of rows) {
      if (!byDept.has(m.department)) byDept.set(m.department, []);
      byDept.get(m.department)!.push(m);
    }

    const blocks: Record<string, unknown>[] = [
      { type: 'header', text: { type: 'plain_text', text: `📊 SLA Update — ${date}`, emoji: true } },
    ];

    for (const [dept, ms] of byDept) {
      const voice = ms.find((m) => m.channel === 'Voice');
      const chat = ms.find((m) => m.channel === 'Chat');
      const lines: string[] = [];
      if (voice) {
        const sla = pct(voice.passed_count, voice.inbound_count);
        const ab = voice.inbound_count > 0 ? (voice.abandoned_count / voice.inbound_count) * 100 : 0;
        lines.push(`📞 *Voice* — SLA *${fmtPct(sla)}* · ${voice.inbound_count} in · aband ${fmtPct(ab)} · ASA ${fmtSecs(voice.wait_seconds)}`);
      }
      if (chat) {
        const sla = pct(chat.passed_count, chat.inbound_count);
        lines.push(`💬 *Chat* — SLA *${fmtPct(sla)}* · ${chat.inbound_count} in · FRT ${fmtSecs(chat.frt_seconds)}`);
      }
      if (lines.length) {
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*${dept}*\n${lines.join('\n')}` } });
      }
    }

    if (email) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*✉️ Email* — closed *${email.total_closed ?? 0}* · replied ${email.total_replied ?? 0} · assigned ${email.total_assigned ?? 0} · open ${email.replies_sent ?? 0}` },
      });
    }

    // Shift Operations Log notes
    const logNotes: string[] = [];
    for (const l of logs || []) {
      const items: string[] = [...(l.selected_items || []), ...(l.custom_notes ? [l.custom_notes] : [])];
      if (items.length) logNotes.push(`*${String(l.type).replace(/^\w/, (c: string) => c.toUpperCase())}:* ${items.join('; ')}`);
    }
    if (logNotes.length) {
      blocks.push({ type: 'divider' });
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `📝 *Shift Notes*\n${logNotes.join('\n')}` } });
    }

    if (blocks.length === 1) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_No metrics synced for this date yet._' } });
    }

    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `SLA Update — ${date}`, blocks }),
    });
    if (!res.ok) throw new Error(`Slack responded ${res.status}: ${(await res.text()).slice(0, 120)}`);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
