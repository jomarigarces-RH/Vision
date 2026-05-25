import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const INTERCOM_TOKEN = process.env.INTERCOM_API_TOKEN;

/**
 * Syncs Today's Intercom metrics to Supabase ops_metrics table.
 * Fetches all conversations created today and aggregates their stats.
 */
export async function POST(req: Request) {
  try {
    if (!INTERCOM_TOKEN) {
      return NextResponse.json({ error: 'Missing INTERCOM_API_TOKEN' }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTimestamp = Math.floor(today.getTime() / 1000);

    // 1. Fetch Conversations from Intercom (Search API)
    // We fetch conversations created or updated today
    const intercomRes = await fetch('https://api.intercom.io/conversations/search', {
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
            { field: 'created_at', operator: '>', value: startTimestamp },
            { field: 'source.author.type', operator: '!=', value: 'admin' } // Ignore outbound
          ]
        },
        pagination: { per_page: 150 }
      })
    });

    if (!intercomRes.ok) {
      const err = await intercomRes.text();
      console.error('[Sync] Intercom API Error:', err);
      return NextResponse.json({ error: 'Failed to fetch from Intercom' }, { status: 500 });
    }

    const { conversations } = await intercomRes.json();
    console.log(`[Sync] Processing ${conversations?.length || 0} conversations`);

    // 2. Aggregate Metrics by Department/Channel
    const TEAM_MAPS = {
      sales: { voice: ['10117691', '10126750'], chat: ['9540784'] },
      support: { voice: ['10117732', '10117711', '10126764'], chat: ['9903546', '9903543'] },
      recovery: { voice: ['10117736'], chat: ['9540789'] }
    };

    const aggregates: Record<string, any> = {};

    for (const conv of (conversations || [])) {
      const teamId = String(conv.team_assignee_id || '');
      let dept = 'Support Operations';
      let channel = 'Chat';

      // Mapping logic
      if (TEAM_MAPS.sales.voice.includes(teamId)) { dept = 'Sales Operations'; channel = 'Voice'; }
      else if (TEAM_MAPS.sales.chat.includes(teamId)) { dept = 'Sales Operations'; channel = 'Chat'; }
      else if (TEAM_MAPS.support.voice.includes(teamId)) { dept = 'Support Operations'; channel = 'Voice'; }
      else if (TEAM_MAPS.support.chat.includes(teamId)) { dept = 'Support Operations'; channel = 'Chat'; }
      else if (TEAM_MAPS.recovery.voice.includes(teamId)) { dept = 'Service Recovery'; channel = 'Voice'; }
      else if (TEAM_MAPS.recovery.chat.includes(teamId)) { dept = 'Service Recovery'; channel = 'Chat'; }
      else {
        // Fallback check for Voice signature in team name or source
        const name = (conv.team_assignee?.name || '').toLowerCase();
        const src = (conv.source?.delivered_as || '').toLowerCase();
        if (name.includes('sales')) dept = 'Sales Operations';
        else if (name.includes('recovery')) dept = 'Service Recovery';
        if (name.includes('voice') || src.includes('aircall') || src.includes('dialpad')) channel = 'Voice';
      }

      const key = `${dept}|${channel}`;
      if (!aggregates[key]) aggregates[key] = { in: 0, pass: 0, ab: 0, frtSum: 0, frtCount: 0, waitSum: 0, hSum: 0, hCount: 0 };

      const stats = conv.statistics;
      aggregates[key].in++;

      if (stats?.first_admin_reply_at) {
        const frt = stats.first_admin_reply_at - conv.created_at;
        if (frt >= 0) {
          aggregates[key].frtSum += frt;
          aggregates[key].frtCount++;
          if (frt <= 75) aggregates[key].pass++;
          
          const wait = stats.first_admin_reply_at - conv.created_at;
          aggregates[key].waitSum += Math.max(0, wait);
        }
      } else if (conv.state === 'closed') {
        aggregates[key].ab++;
      }

      if (stats?.closed_at && stats?.first_admin_reply_at) {
        const handle = stats.closed_at - stats.first_admin_reply_at;
        if (handle >= 0) {
          aggregates[key].hSum += handle;
          aggregates[key].hCount++;
        }
      }
    }

    // 3. Batched Update to Supabase
    const dateStr = today.toISOString().split('T')[0];
    
    // Clear and Reset for today before inserting fresh aggregates 
    // (This ensures the "Sync" is a complete refresh of today's stats)
    // Alternatively, we can use the RPC in a loop, but resetting is cleaner for full syncs
    for (const [key, data] of Object.entries(aggregates)) {
      const [dept, chan] = key.split('|');
      
      // We'll update the table directly for the full sync state
      await supabase.from('ops_metrics').upsert({
        department: dept,
        channel: chan,
        date: dateStr,
        inbound_count: data.in,
        passed_count: data.pass,
        abandoned_count: data.ab,
        frt_seconds: data.frtCount > 0 ? Math.round(data.frtSum / data.frtCount) : 0,
        wait_seconds: data.frtCount > 0 ? Math.round(data.waitSum / data.frtCount) : 0,
        handle_seconds: data.hCount > 0 ? Math.round(data.hSum / data.hCount) : 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'department,channel,date' });
    }

    return NextResponse.json({ status: 'success', synced: Object.keys(aggregates).length });

  } catch (error: any) {
    console.error('[Sync] Critical Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
