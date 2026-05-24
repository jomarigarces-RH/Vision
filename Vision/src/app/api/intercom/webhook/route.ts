import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Initial Validation / Ping from Intercom
    if (body.topic === 'ping') {
      return NextResponse.json({ message: 'pong' });
    }

    const { topic, data } = body;
    const conversation = data?.item;

    if (!conversation) {
      return NextResponse.json({ message: 'No conversation data' }, { status: 400 });
    }

    const convId = conversation.id;
    const createdAt = new Date(conversation.created_at * 1000);
    
    // We only care about the FIRST admin reply for SLA
    if (topic === 'conversation.admin.replied') {
      const firstReplyAt = new Date(conversation.statistics?.first_admin_reply_at * 1000);
      
      if (conversation.statistics?.first_admin_reply_at) {
        const frtSeconds = Math.floor((firstReplyAt.getTime() - createdAt.getTime()) / 1000);
        const slaStatus = frtSeconds <= 75 ? 'pass' : 'fail';
        
        // Upsert the event into Supabase
        await supabase
          .from('intercom_events')
          .upsert({
            conversation_id: convId,
            topic: topic,
            intercom_created_at: createdAt.toISOString(),
            first_reply_at: firstReplyAt.toISOString(),
            frt_seconds: frtSeconds,
            sla_status: slaStatus,
            raw_payload: body
          }, { onConflict: 'conversation_id' });

        // Update the daily summary (Smart Aggregation)
        const dateStr = createdAt.toISOString().split('T')[0];
        
        // This SQL increment would be better in a Supabase Function, 
        // but for now we'll do 1 query.
        await updateDailySLA(dateStr, slaStatus, frtSeconds);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateDailySLA(date: string, status: 'pass' | 'fail', frt: number) {
  // Check if row exists
  const { data: existing } = await supabase
    .from('intercom_sla_daily')
    .select('*')
    .eq('date', date)
    .single();

  if (!existing) {
    await supabase.from('intercom_sla_daily').insert({
      date,
      inbound_count: 1,
      sla_passes: status === 'pass' ? 1 : 0,
      sla_fails: status === 'fail' ? 1 : 0
    });
  } else {
    await supabase.from('intercom_sla_daily').update({
      inbound_count: existing.inbound_count + 1,
      sla_passes: status === 'pass' ? existing.sla_passes + 1 : existing.sla_passes,
      sla_fails: status === 'fail' ? existing.sla_fails + 1 : existing.sla_fails,
      updated_at: new Date().toISOString()
    }).eq('date', date);
  }
}
