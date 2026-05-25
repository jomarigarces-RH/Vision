import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const INTERCOM_TOKEN = process.env.INTERCOM_API_TOKEN;

export async function POST(req: Request) {
  try {
    if (!INTERCOM_TOKEN) return NextResponse.json({ error: 'Missing token' }, { status: 500 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTs = Math.floor(today.getTime() / 1000);
    const dateStr = today.toISOString().split('T')[0];

    // 1. Fetch All Teams first to build a name-based map
    const teamRes = await fetch('https://api.intercom.io/teams', {
      headers: { 'Authorization': `Bearer ${INTERCOM_TOKEN}`, 'Accept': 'application/json', 'Intercom-Version': '2.11' }
    });
    const teamJson = await teamRes.json();
    const teamMap: Record<string, string> = {};
    (teamJson.teams || []).forEach((t: any) => { teamMap[t.id] = t.name; });

    console.log(`[Super-Sync] 🚀 Scanning 1k+ items for ${dateStr}...`);

    let allConvs: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 50) {
      const res = await fetch(`https://api.intercom.io/conversations/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Intercom-Version': '2.11'
        },
        body: JSON.stringify({
          query: {
            operator: 'AND',
            value: [
              { field: 'created_at', operator: '>', value: startTs },
              { field: 'source.author.type', operator: '!=', value: 'admin' }
            ]
          },
          pagination: { page, per_page: 150 } // MAX TURBO: 150 items per page
        })
      });

      const data = await res.json();
      if (data.conversations?.length > 0) {
        allConvs = [...allConvs, ...data.conversations];
        console.log(`[Super-Sync] Page ${page}: +${data.conversations.length} (Total: ${allConvs.length})`);
        page++;
      } else { hasMore = false; }
    }

    const metrics: any = {};
    allConvs.forEach(c => {
      const teamId = String(c.team_assignee_id || '');
      const teamName = teamMap[teamId] || 'Unassigned';
      const nameLower = teamName.toLowerCase();

      let dept = 'Support Operations';
      if (nameLower.includes('sales')) dept = 'Sales Operations';
      if (nameLower.includes('recovery')) dept = 'Service Recovery';

      let chan = 'Chat';
      // Voice detection
      const src = (c.source?.delivered_as || '').toLowerCase();
      if (nameLower.includes('voice') || src.includes('aircall') || src.includes('dialpad')) chan = 'Voice';

      const key = `${dept}|${chan}`;
      if (!metrics[key]) metrics[key] = { in: 0, pass: 0, ab: 0, frt: 0, count: 0 };

      metrics[key].in++;
      const stats = c.statistics;
      if (stats?.first_admin_reply_at) {
        const frt = stats.first_admin_reply_at - c.created_at;
        if (frt <= 75) metrics[key].pass++;
        metrics[key].frt += frt;
        metrics[key].count++;
      } else if (c.state === 'closed') {
        metrics[key].ab++;
      }
    });

    for (const [key, m] of Object.entries(metrics) as any) {
      const [dept, chan] = key.split('|');
      await supabase.from('ops_metrics').upsert({
        department: dept, channel: chan, date: dateStr,
        inbound_count: m.in, passed_count: m.pass, abandoned_count: m.ab,
        frt_seconds: Math.round(m.frt / (m.count || 1)),
        updated_at: new Date().toISOString()
      }, { onConflict: 'department,channel,date' });
    }

    return NextResponse.json({ status: 'success', synced: allConvs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
