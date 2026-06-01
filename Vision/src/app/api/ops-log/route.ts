import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase'; // server-only; bypasses RLS

// Persist the Shift Operations Log for a date so it stays for everyone (RLS makes
// the browser read-only, so the write must happen here with the service role).
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SECTIONS = ['mitigations', 'causes', 'keynotes'] as const;

type Section = { applicable?: boolean; selected?: string[]; custom?: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const date = String(body?.date || '');
    if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Invalid date (YYYY-MM-DD)' }, { status: 400 });
    const sections: Record<string, Section> = body?.sections || {};

    const toUpsert: Record<string, unknown>[] = [];
    const toDelete: string[] = [];
    for (const key of SECTIONS) {
      const s = sections[key];
      if (s?.applicable) {
        toUpsert.push({
          type: key,
          date,
          selected_items: Array.isArray(s.selected) ? s.selected : [],
          custom_notes: s.custom?.trim() ? s.custom : null,
        });
      } else {
        toDelete.push(key); // not applicable -> remove any saved row for the day
      }
    }

    if (toUpsert.length) {
      const { error } = await supabase.from('ops_log').upsert(toUpsert, { onConflict: 'type,date' });
      if (error) throw error;
    }
    if (toDelete.length) {
      await supabase.from('ops_log').delete().eq('date', date).in('type', toDelete);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
