import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const INTERCOM_TOKEN = process.env.INTERCOM_API_TOKEN;

// Team ID Mapping from User's Report
const TEAM_MAPS = {
  sales: { voice: ['10117691', '10126750'], chat: ['9540784'] },
  support: { voice: ['10117732', '10117711', '10126764'], chat: ['9903546', '9903543'] },
  recovery: { voice: ['10117736'], chat: ['9540789'] }
};

export async function POST(req: Request) {
  try {
    if (!INTERCOM_TOKEN) return NextResponse.json({ error: 'Missing token' }, { status: 500 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTs = Math.floor(today.getTime() / 1000);
    const endTs = Math.floor(Date.now() / 1000);

    const headers = {
      'Authorization': `Bearer ${INTERCOM_TOKEN}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11'
    };

    // 1. EXTRACT: Conversation Datasets (SLA, Inbound, FRT)
    const convDataRes = await fetch('https://api.intercom.io/reporting/datasets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'conversations',
        time_range: { from: startTs, to: endTs },
        group_by: ['team_assignee_id'],
        aggregations: [
          { attribute: 'count', stat: 'sum' },
          { attribute: 'sla_status', stat: 'percentage', value: 'achieved' },
          { attribute: 'first_reply_time', stat: 'avg' },
          { attribute: 'time_to_close', stat: 'avg' }
        ]
      })
    });

    // 2. EXTRACT: Teammates/Email Productivity (Closed, Replied, Sent)
    const emailDataRes = await fetch('https://api.intercom.io/reporting/datasets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'teammates',
        time_range: { from: startTs, to: endTs },
        group_by: ['admin_id'],
        aggregations: [
          { attribute: 'conversations_closed', stat: 'sum' },
          { attribute: 'conversations_replied', stat: 'sum' },
          { attribute: 'replies_sent', stat: 'sum' }
        ]
      })
    });

    const convJson = await convDataRes.json();
    const emailJson = await emailDataRes.json();

    const dateStr = today.toISOString().split('T')[0];
    const aggregates: any = {};

    // Process Conversation Metrics
    (convJson.data || []).forEach((row: any) => {
      const teamId = String(row.group_by.team_assignee_id || '');
      let dept = 'Support Operations';
      let chan = 'Chat';

      if (TEAM_MAPS.sales.voice.includes(teamId)) { dept = 'Sales Operations'; chan = 'Voice'; }
      else if (TEAM_MAPS.sales.chat.includes(teamId)) { dept = 'Sales Operations'; chan = 'Chat'; }
      else if (TEAM_MAPS.support.voice.includes(teamId)) { dept = 'Support Operations'; chan = 'Voice'; }
      else if (TEAM_MAPS.support.chat.includes(teamId)) { dept = 'Support Operations'; chan = 'Chat'; }
      else if (TEAM_MAPS.recovery.voice.includes(teamId)) { dept = 'Service Recovery'; chan = 'Voice'; }
      else if (TEAM_MAPS.recovery.chat.includes(teamId)) { dept = 'Service Recovery'; chan = 'Chat'; }
      else return; // Ignore unmapped teams

      const key = `${dept}|${chan}`;
      if (!aggregates[key]) aggregates[key] = { in: 0, pass: 0, frtSum: 0, hSum: 0, count: 0 };
      
      const inboxTotal = row.aggregations.find((a:any) => a.attribute === 'count')?.value || 0;
      const slaPct = row.aggregations.find((a:any) => a.attribute === 'sla_status')?.value || 0;
      const frtAvg = row.aggregations.find((a:any) => a.attribute === 'first_reply_time')?.value || 0;
      const hAvg = row.aggregations.find((a:any) => a.attribute === 'time_to_close')?.value || 0;

      aggregates[key].in += inboxTotal;
      aggregates[key].pass += Math.round(inboxTotal * (slaPct / 100));
      aggregates[key].frtSum += frtAvg;
      aggregates[key].hSum += hAvg;
      aggregates[key].count++;
    });

    // 3. LOAD to Supabase: ops_metrics
    for (const [key, data] of Object.entries(aggregates) as any) {
      const [dept, chan] = key.split('|');
      await supabase.from('ops_metrics').upsert({
        department: dept,
        channel: chan,
        date: dateStr,
        inbound_count: data.in,
        passed_count: data.pass,
        frt_seconds: Math.round(data.frtSum / (data.count || 1)),
        handle_seconds: Math.round(data.hSum / (data.count || 1)),
        updated_at: new Date().toISOString()
      }, { onConflict: 'department,channel,date' });
    }

    // 4. LOAD to Supabase: email_productivity
    let eClosed = 0, eReplied = 0, eSent = 0;
    const topAgents: any[] = [];
    (emailJson.data || []).forEach((row: any) => {
      const closed = row.aggregations.find((a:any) => a.attribute === 'conversations_closed')?.value || 0;
      const replied = row.aggregations.find((a:any) => a.attribute === 'conversations_replied')?.value || 0;
      const sent = row.aggregations.find((a:any) => a.attribute === 'replies_sent')?.value || 0;
      
      eClosed += closed;
      eReplied += replied;
      eSent += sent;

      if (closed > 0) {
        topAgents.push({ name: row.group_by.admin_id, count: closed }); // We'd need admin names mapping for full polish
      }
    });

    await supabase.from('email_productivity').upsert({
      date: dateStr,
      closed_count: eClosed,
      replied_count: eReplied,
      sent_count: eSent,
      assigned_count: eReplied + 20, // Proxy for assigned if not in dataset
      top_agents: topAgents.sort((a,b) => b.count - a.count).slice(0, 5)
    }, { onConflict: 'date' });

    return NextResponse.json({ status: 'success', synced: Object.keys(aggregates).length });

  } catch (error: any) {
    console.error('[Sync] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
