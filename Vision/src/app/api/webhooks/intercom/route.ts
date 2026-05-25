import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * INTERCOM WEBHOOK HANDLER
 * Receives events from Intercom, calculates SLA performance, and updates Supabase.
 * 
 * FIXES APPLIED:
 * - Added conversation.admin.assigned handling (team ID reliable here)
 * - Removed team-name fallback (team_assignee object is often undefined even when ID exists)
 * - Guarded against writing metrics when no team context on user.created
 * - Added unmapped team ID warning log
 * - Fixed double-write bug on inbound (was calling both increment_sla_metrics + update_ops_metrics with zeros)
 * - Added raw team_assignee_id debug log
 */

// ─── Team ID → Dept/Channel Map ──────────────────────────────────────────────
const TEAM_MAPS: Record<string, { dept: string; channel: string }> = {
  // Sales
  '10117691': { dept: 'Sales Operations', channel: 'Voice' },
  '10126750': { dept: 'Sales Operations', channel: 'Voice' },
  '9540784': { dept: 'Sales Operations', channel: 'Chat' },
  // Support
  '10117732': { dept: 'Support Operations', channel: 'Voice' },
  '10117711': { dept: 'Support Operations', channel: 'Voice' },
  '10126764': { dept: 'Support Operations', channel: 'Voice' },
  '9903546': { dept: 'Support Operations', channel: 'Chat' },
  '9903543': { dept: 'Support Operations', channel: 'Chat' },
  // Recovery
  '10117736': { dept: 'Service Recovery', channel: 'Voice' },
  '9540789': { dept: 'Service Recovery', channel: 'Chat' },
};

const DEFAULT_DEPT = 'Support Operations';
const DEFAULT_CHANNEL = 'Chat';

// Voice source signatures for channel fallback detection
const VOICE_SIGNATURES = ['voice', 'phone', 'call', 'aircall', 'talk', 'dialpad', 'ringcentral', 'automated'];

// ─── Helper: Resolve Dept + Channel ──────────────────────────────────────────
function resolveDeptAndChannel(conversation: any): {
  dept: string;
  channel: string;
  resolved: boolean;
} {
  const teamId = conversation.team_assignee_id != null
    ? String(conversation.team_assignee_id)
    : '';

  // 1. Precise ID match (most reliable)
  if (teamId && TEAM_MAPS[teamId]) {
    return { ...TEAM_MAPS[teamId], resolved: true };
  }

  // 2. Warn on unknown but non-empty team IDs
  if (teamId) {
    console.warn(`[Webhook] ⚠️ Unmapped TeamID: ${teamId} — falling back to source/tag detection`);
  }

  // 3. Source + tag fallback (only reliable for channel, not dept)
  const sourceApp = (conversation.source?.delivered_as || conversation.source?.type || '').toLowerCase();
  const tags = (conversation.tags?.tags || []).map((t: any) => String(t.name).toLowerCase());
  const allHints = [sourceApp, ...tags].join(' ');

  let dept = DEFAULT_DEPT;
  let channel = DEFAULT_CHANNEL;

  if (allHints.includes('sales')) dept = 'Sales Operations';
  if (allHints.includes('recovery')) dept = 'Service Recovery';
  if (VOICE_SIGNATURES.some(sig => allHints.includes(sig))) channel = 'Voice';

  return { dept, channel, resolved: false };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Intercom ping/test
    if (body.type === 'notification_test' || !body.topic) {
      return NextResponse.json({ status: 'success', message: 'Test notification received' });
    }

    const eventType = body.topic;
    const conversation = body.data?.item;

    if (!conversation) {
      return NextResponse.json({ status: 'ignored', reason: 'No conversation item found' });
    }

    // Filter: Ignore Outbound (Admin-initiated conversations)
    const authorType = conversation.source?.author?.type;
    if (authorType === 'admin') {
      console.log(`[Webhook] Ignoring outbound conversation (author: admin)`);
      return NextResponse.json({ status: 'ignored', reason: 'Outbound conversation' });
    }

    // ── Debug Logs ──────────────────────────────────────────────────────────
    console.log(`[Intercom Webhook] Topic: ${eventType}`);
    console.log(`[Intercom Webhook] Raw team_assignee_id:`, conversation.team_assignee_id ?? 'NULL/UNDEFINED');
    console.log(`[Intercom Webhook] Source:`, JSON.stringify(conversation.source));
    console.log(`[Intercom Webhook] Metadata:`, JSON.stringify(conversation.metadata || {}));

    // ── Resolve Routing ─────────────────────────────────────────────────────
    const { dept: mappedDept, channel: mappedChannel, resolved } = resolveDeptAndChannel(conversation);
    const today = new Date().toISOString().split('T')[0];
    const stats = conversation.statistics;

    console.log(`[Webhook] ${eventType} -> Dept: ${mappedDept}, Chan: ${mappedChannel}, Resolved: ${resolved}`);

    // ── Metric Variables ────────────────────────────────────────────────────
    let isSlaPass = false;
    let secondsToReply = 0;
    let queueTime = 0;
    let handleTime = 0;
    let isAbandon = false;
    let isInbound = false;

    // ── Event Logic ─────────────────────────────────────────────────────────

    if (eventType === 'conversation.user.created') {
      // Team is never assigned at this point — only flag inbound, skip team metrics
      // The actual dept/channel will be captured on the subsequent admin.replied event
      isInbound = true;

      console.log(`[Webhook] Inbound created — no team context yet, recording inbound only`);

      const { error } = await supabase.rpc('increment_sla_metrics', {
        target_date: today,
        is_pass: false,
      });
      if (error) console.error('[Webhook] increment_sla_metrics error:', error.message);

      return NextResponse.json({ status: 'success', event: eventType, note: 'inbound recorded, team TBD' });
    }

    else if (eventType === 'conversation.admin.assigned') {
      // Team is now reliably set — good moment to ensure routing is correct
      // No SLA metrics to record here, just confirm routing resolved
      if (!resolved) {
        console.warn(`[Webhook] Assignment event but team still unresolved`);
      }
      // Nothing to write to DB for this event alone, but useful for future
      // state-tracking if you add a conversations table
      return NextResponse.json({ status: 'success', event: eventType, dept: mappedDept, channel: mappedChannel });
    }

    else if (eventType === 'conversation.admin.replied') {
      if (stats?.last_admin_reply_at && stats?.last_user_reply_at) {
        secondsToReply = stats.last_admin_reply_at - stats.last_user_reply_at;

        // FIX: guard against negative values (clock skew / out-of-order events)
        if (secondsToReply < 0) {
          console.warn(`[Webhook] Negative FRT detected (${secondsToReply}s) — clamping to 0`);
          secondsToReply = 0;
        }

        isSlaPass = secondsToReply <= 75;
      }

      if (stats?.first_admin_reply_at && conversation.created_at) {
        queueTime = stats.first_admin_reply_at - conversation.created_at;
        if (queueTime < 0) queueTime = 0;
      }
    }

    else if (eventType === 'conversation.admin.closed') {
      if (!stats?.first_admin_reply_at) {
        // Closed with no admin reply ever = abandoned
        isAbandon = true;
      } else if (stats.closed_at && stats.first_admin_reply_at) {
        handleTime = stats.closed_at - stats.first_admin_reply_at;
        if (handleTime < 0) handleTime = 0;
      }
    }

    else {
      // Unhandled event type — log and skip
      console.log(`[Webhook] Unhandled event type: ${eventType} — ignoring`);
      return NextResponse.json({ status: 'ignored', reason: `Unhandled event: ${eventType}` });
    }

    // ── Write to DB ─────────────────────────────────────────────────────────
    const { error: rpcError } = await supabase.rpc('update_ops_metrics', {
      p_dept: mappedDept,
      p_chan: mappedChannel,
      p_date: today,
      p_is_pass: isSlaPass,
      p_frt: secondsToReply,
      p_wait: queueTime,
      p_handle: handleTime,
      p_is_abandon: isAbandon,
      p_is_inbound: isInbound,
    });

    if (rpcError) {
      console.error('[Webhook] update_ops_metrics DB error:', rpcError.message);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      event: eventType,
      dept: mappedDept,
      channel: mappedChannel,
      resolved, // true = matched by team ID, false = used fallback
    });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Health Check ──────────────────────────────────────────────────────────────
export async function GET() {
  return new Response('Intercom Webhook Handler is LIVE 🚀');
}