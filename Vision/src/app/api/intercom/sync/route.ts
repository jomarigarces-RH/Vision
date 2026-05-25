import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const INTERCOM_TOKEN = process.env.INTERCOM_API_TOKEN;

// STRICT ID LIST (Only what you told me)
const SUPPORT_VOICE = ['10117732', '10117711', '10126764'];
const SALES_VOICE = ['10117691', '10126750'];
const RECOVERY_VOICE = ['10117736'];

export async function POST(req: Request) {
  try {
    if (!INTERCOM_TOKEN) return NextResponse.json({ error: 'Missing token' }, { status: 500 });
    
    // 1. PST TIMEZONE ALIGNMENT
    const now = new Date();
    const pstDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    pstDate.setHours(0, 0, 0, 0);
    const startTs = Math.floor(pstDate.getTime() / 1000);
    const dateStr = pstDate.toISOString().split('T')[0];

    console.log(`[Strict-Sync] 📡 Syncing for ${dateStr} (PST)...`);

    let allConvs: any[] = [];
    let page = 1;
    let hasMore = true;

    // 2. UNFILTERED FETCH (Filtered in JS for total control)
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
          query: { field: 'created_at', operator: '>', value: startTs },
          pagination: { page, per_page: 150 }
        })
      });

      const data = await res.json();
      if (data.conversations?.length > 0) {
        allConvs = [...allConvs, ...data.conversations];
        page++;
      } else { hasMore = false; }
    }

    const metrics: any = {
      'Support Operations|Voice': { in: 0, pass: 0, ab: 0, frt: 0, h: 0, count: 0 },
      'Sales Operations|Voice': { in: 0, pass: 0, ab: 0, frt: 0, h: 0, count: 0 },
      'Service Recovery|Voice': { in: 0, pass: 0, ab: 0, frt: 0, h: 0, count: 0 }
    };

    allConvs.forEach(c => {
      // RULE: Strictly follow the provided Team IDs
      const teamId = String(c.team_assignee_id || '');
      let key = null;

      if (SUPPORT_VOICE.includes(teamId)) key = 'Support Operations|Voice';
      else if (SALES_VOICE.includes(teamId)) key = 'Sales Operations|Voice';
      else if (RECOVERY_VOICE.includes(teamId)) key = 'Service Recovery|Voice';

      if (!key) return; // Ignore everything else (Retail, Spanish etc)

      metrics[key].in++;
      const stats = c.statistics;
      if (stats?.first_admin_reply_at) {
        const frt = stats.first_admin_reply_at - c.created_at;
        if (frt <= 75) metrics[key].pass++;
        metrics[key].frt += frt;
        metrics[key].count++;
        if (stats.closed_at) metrics[key].h += (stats.closed_at - stats.first_admin_reply_at);
      } else if (c.state === 'closed') {
        metrics[key].ab++;
      }
    });

    for (const [key, m] of Object.entries(metrics) as any) {
      const [dept, chan] = key.split('|');
      const avg_frt = Math.round(m.frt / (m.count || 1));
      const avg_h = Math.round(m.h / (m.count || 1));
      
      await supabase.from('ops_metrics').upsert({
        department: dept, channel: chan, date: dateStr,
        inbound_count: m.in, 
        passed_count: m.pass, 
        abandoned_count: m.ab,
        frt_seconds: avg_frt,
        handle_seconds: avg_h,
        wait_seconds: avg_frt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'department,channel,date' });
    }

    console.log(`[Strict-Sync] ✅ Successfully synced ${allConvs.length} items for ${dateStr}.`);
    return NextResponse.json({ status: 'success', synced: allConvs.length });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
