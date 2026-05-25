import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * INTERCOM WEBHOOK HANDLER (The "Bouncer")
 * Receives events from Intercom, calculates SLA performance, and updates Supabase.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Handle Intercom's test/ping requests specially
    if (body.type === 'notification_test' || !body.topic) {
      return NextResponse.json({ status: 'success', message: 'Test notification received' });
    }

    const eventType = body.topic;
    const conversation = body.data?.item;
    if (!conversation) {
      return NextResponse.json({ status: 'ignored', reason: 'No conversation item found' });
    }

    // 0. Filter: Ignore Outbound (Admin-initiated)
    const authorType = conversation.source?.author?.type;
    if (authorType === 'admin') {
      console.log(`[Webhook] Ignoring Outbound conversation (Author: admin)`);
      return NextResponse.json({ status: 'ignored', reason: 'Outbound conversation' });
    }

    // 1. Precise Team ID Mappings
    const TEAM_MAPS = {
      sales: { voice: ['10117691', '10126750'], chat: ['9540784'] },
      support: { voice: ['10117732', '10117711', '10126764'], chat: ['9903546', '9903543'] },
      recovery: { voice: ['10117736'], chat: ['9540789'] }
    };

    let mappedDept = 'Support Operations';
    let mappedChannel = 'Chat';
    
    const teamId = String(conversation.team_assignee_id || '');
    const sourceApp = conversation.source?.delivered_as || conversation.source?.type || '';
    const tags = (conversation.tags?.tags || []).map((t: any) => t.name.toLowerCase());
    const allIdentifiers = [
      (conversation.team_assignee?.name || '').toLowerCase(),
      sourceApp.toLowerCase(),
      ...tags
    ].join(' ');

    // Precise ID Check First
    if (TEAM_MAPS.sales.voice.includes(teamId)) { mappedDept = 'Sales Operations'; mappedChannel = 'Voice'; }
    else if (TEAM_MAPS.sales.chat.includes(teamId)) { mappedDept = 'Sales Operations'; mappedChannel = 'Chat'; }
    else if (TEAM_MAPS.support.voice.includes(teamId)) { mappedDept = 'Support Operations'; mappedChannel = 'Voice'; }
    else if (TEAM_MAPS.support.chat.includes(teamId)) { mappedDept = 'Support Operations'; mappedChannel = 'Chat'; }
    else if (TEAM_MAPS.recovery.voice.includes(teamId)) { mappedDept = 'Service Recovery'; mappedChannel = 'Voice'; }
    else if (TEAM_MAPS.recovery.chat.includes(teamId)) { mappedDept = 'Service Recovery'; mappedChannel = 'Chat'; }
    else {
      // Robust Fallback Detection
      if (allIdentifiers.includes('sales')) mappedDept = 'Sales Operations';
      else if (allIdentifiers.includes('recovery')) mappedDept = 'Service Recovery';

      // Advanced Voice Detection (Dialpad, RingCentral, Aircall, etc)
      const voiceSigs = ['voice', 'phone', 'call', 'aircall', 'talk', 'dialpad', 'ringcentral', 'automated'];
      if (voiceSigs.some(sig => allIdentifiers.includes(sig))) {
        mappedChannel = 'Voice';
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const stats = conversation.statistics;

    // 2. Logic Flow: What are we tracking?
    let isSlaPass = false;
    let secondsToReply = 0;
    let queueTime = 0;
    let handleTime = 0;
    let isAbandon = false;
    let isInbound = false;

    // Handle Event Workflow
    if (eventType === 'conversation.user.created') {
      isInbound = true;
    } 
    else if (eventType === 'conversation.admin.replied') {
      // Only count SLA and FRT on first reply or subsequent ones
      if (stats?.last_admin_reply_at && stats?.last_user_reply_at) {
        secondsToReply = stats.last_admin_reply_at - stats.last_user_reply_at;
        isSlaPass = secondsToReply <= 75;
        
        // Queue Time: Created -> First Admin Reply
        if (stats.first_admin_reply_at && conversation.created_at) {
          queueTime = stats.first_admin_reply_at - conversation.created_at;
        }
      }
    } 
    else if (eventType === 'conversation.admin.closed') {
      // Abandoned: Closed without any admin ever replying
      if (!stats?.first_admin_reply_at) {
        isAbandon = true;
      } else if (stats.closed_at && stats.first_admin_reply_at) {
        // AHT: First Admin Reply until Closed
        handleTime = stats.closed_at - stats.first_admin_reply_at;
      }
    }

    console.log(`[Intercom Webhook] Topic: ${eventType}`);
    console.log(`[Intercom Webhook] Source:`, JSON.stringify(conversation.source));
    console.log(`[Intercom Webhook] Team: ${teamId}, Name: ${conversation.team_assignee?.name}`);
    console.log(`[Intercom Webhook] Metadata:`, JSON.stringify(conversation.metadata || {}));

    console.log(`[Webhook] ${eventType} -> Dept: ${mappedDept}, Chan: ${mappedChannel}, TeamID: ${teamId || 'NONE'}, Inbound: ${isInbound}, Abandon: ${isAbandon}`);

    // 3. Update Database
    // Special case for legacy SLA table
    if (isInbound) {
      await supabase.rpc('increment_sla_metrics', {
        target_date: today,
        is_pass: false // Inbound just increments count
      });
    }

    // Main Metrics Update
    const { error: rpcError } = await supabase.rpc('update_ops_metrics', {
      p_dept: mappedDept,
      p_chan: mappedChannel,
      p_date: today,
      p_is_pass: isSlaPass,
      p_frt: secondsToReply,
      p_wait: queueTime,
      p_handle: handleTime,
      p_is_abandon: isAbandon,
      p_is_inbound: isInbound
    });

    if (rpcError) {
      console.error('[Webhook] DB Error:', rpcError.message);
    }

    return NextResponse.json({ status: 'success', dept: mappedDept, channel: mappedChannel });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * SIMPLE GET: For health checks
 */
export async function GET() {
  return new Response('Intercom Webhook Handler is LIVE 🚀');
}
