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

    // 1. Map department and channel using Team Names AND Tags
    let mappedDept = 'Support Operations';
    let mappedChannel = 'Chat';
    
    // Extract metadata for better matching
    const teamName = (conversation.team_assignee?.name || '').toLowerCase();
    const tags = (conversation.tags?.tags || []).map((t: any) => t.name.toLowerCase());
    const allIdentifiers = [teamName, ...tags].join(' ');

    // Department Mapping
    if (allIdentifiers.includes('sales')) mappedDept = 'Sales Operations';
    else if (allIdentifiers.includes('recovery')) mappedDept = 'Service Recovery';

    // Channel Mapping (Voice vs Chat)
    const sourceType = (conversation.source?.type || '').toLowerCase();
    const deliveryMethod = (conversation.source?.delivery_method || '').toLowerCase();
    
    if (
      allIdentifiers.includes('voice') || 
      allIdentifiers.includes('phone') || 
      allIdentifiers.includes('call') ||
      sourceType === 'phone' || 
      sourceType === 'call' || 
      deliveryMethod === 'phone'
    ) {
      mappedChannel = 'Voice';
    }

    const today = new Date().toISOString().split('T')[0];
    const stats = conversation.statistics;

    // 2. Handle different event types for different metrics
    let shouldUpdate = false;
    let isSlaPass = false;
    let secondsToReply = 0;
    let queueTime = 0;
    let handleTime = 0;
    let isAbandon = false;

    if (eventType === 'conversation.user.created') {
      // Direct Inbound increment
      shouldUpdate = true;
    } else if (eventType === 'conversation.admin.replied') {
      // Calculate FRT and SLA
      if (stats?.last_admin_reply_at && stats?.last_user_reply_at) {
        secondsToReply = stats.last_admin_reply_at - stats.last_user_reply_at;
        isSlaPass = secondsToReply <= 75;
        
        // Queue Time: Created -> First Admin Reply
        if (stats.first_admin_reply_at && conversation.created_at) {
          queueTime = stats.first_admin_reply_at - conversation.created_at;
        }
        shouldUpdate = true;
      }
    } else if (eventType === 'conversation.admin.closed') {
      // Abandoned check: Closed without any admin reply
      if (!stats?.first_admin_reply_at) {
        isAbandon = true;
      } else if (stats.closed_at && stats.first_admin_reply_at) {
        // AHT: First Reply -> Closed
        handleTime = stats.closed_at - stats.first_admin_reply_at;
      }
      shouldUpdate = true;
    }

    if (!shouldUpdate) {
      return NextResponse.json({ status: 'ignored', reason: 'Non-matching event workflow' });
    }

    console.log(`[Webhook] ${eventType} for ${mappedDept} [${mappedChannel}]. SLA: ${isSlaPass}, Abandon: ${isAbandon}, Queue: ${queueTime}s, AHT: ${handleTime}s`);

    // 3. Database Update: Atomic Increments
    if (eventType === 'conversation.admin.replied') {
      await supabase.rpc('increment_sla_metrics', {
        target_date: today,
        is_pass: isSlaPass
      });
    }

    const { error: rpcError } = await supabase.rpc('update_ops_metrics', {
      p_dept: mappedDept,
      p_chan: mappedChannel,
      p_date: today,
      p_is_pass: isSlaPass,
      p_frt: secondsToReply,
      p_wait: queueTime,
      p_handle: handleTime,
      p_is_abandon: isAbandon
    });

    if (rpcError) {
      console.error('[Webhook] DB Error:', rpcError.message);
      return NextResponse.json({ status: 'error', message: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', dept: mappedDept, event: eventType });

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
