import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * INTERCOM WEBHOOK HANDLER (The "Bouncer")
 * Receives events from Intercom, calculates SLA performance, and updates Supabase.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.topic || body.type;

    // 1. Filter: We only care about admin replies for SLA calculation
    if (eventType !== 'conversation.admin.replied') {
      return NextResponse.json({ status: 'ignored', reason: 'Not an admin reply' });
    }

    const conversation = body.data?.item;
    if (!conversation) throw new Error('No conversation data found');

    // 2. SLA Logic: Calculate time between user's last message and admin's reply
    // Intercom provides timestamps in seconds
    const adminReplyTime = conversation.statistics?.last_admin_reply_at;
    const userMessageTime = conversation.statistics?.last_user_reply_at;

    if (!adminReplyTime || !userMessageTime) {
      return NextResponse.json({ status: 'ignored', reason: 'Missing timestamps' });
    }

    const secondsToReply = adminReplyTime - userMessageTime;
    const isSlaPass = secondsToReply <= 75; // 75-second SLA threshold

    // 3. Database Update: Upsert today's metrics
    const today = new Date().toISOString().split('T')[0];

    // Map department (Intercom team) to our dashboard departments
    let mappedDept = 'Support Operations';
    const teamName = conversation.team_assignee?.name || 'Support';
    if (teamName.toLowerCase().includes('sales')) mappedDept = 'Sales Operations';
    if (teamName.toLowerCase().includes('recovery')) mappedDept = 'Service Recovery';

    // Update the high-level daily stats
    await supabase.rpc('increment_sla_metrics', {
      target_date: today,
      is_pass: isSlaPass
    });

    // Update the detailed Ops Metrics
    const { data: currentMetric } = await supabase
      .from('ops_metrics')
      .select('*')
      .eq('department', mappedDept)
      .eq('channel', 'Chat')
      .eq('date', today)
      .maybeSingle();

    if (currentMetric) {
      await supabase
        .from('ops_metrics')
        .update({
          inbound_count: (currentMetric.inbound_count || 0) + 1,
          frt_seconds: Math.round(((currentMetric.frt_seconds || 0) + secondsToReply) / 2), // Average
          updated_at: new Date().toISOString()
        })
        .match({ department: mappedDept, channel: 'Chat', date: today });
    } else {
      await supabase
        .from('ops_metrics')
        .insert({
          department: mappedDept,
          channel: 'Chat',
          date: today,
          inbound_count: 1,
          frt_seconds: secondsToReply
        });
    }

    return NextResponse.json({ 
      status: 'success', 
      sla: isSlaPass ? 'PASS' : 'FAIL',
      seconds: secondsToReply 
    });


  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * SIMPLE GET: For health checks
 */
export async function GET() {
  return new Response('Intercom Webhook Handler is LIVE 🚀');
}
