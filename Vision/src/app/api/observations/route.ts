import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { normalizeName } from '@/lib/vision-utils';

/**
 * FETCH OBSERVATIONS: With optimized filtering and caching.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agent = searchParams.get('agent');
    const coach = searchParams.get('coach');
    const since = searchParams.get('since');
    const end = searchParams.get('end');

    let query = supabase
      .from('observations')
      .select('*')
      .order('date', { ascending: false });

    if (agent) query = query.eq('agent_name', agent);
    if (coach) query = query.eq('coach_name', coach);
    if (since) query = query.gte('date', since);
    if (end) query = query.lte('date', end);

    const { data, error } = await query;

    if (error) throw error;

    const response = NextResponse.json(data);
    // Cache filtered results for 30s to save bandwidth
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * CREATE OBSERVATION: Automatically cleans up active sessions.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const agent = normalizeName(body.agentName);

    // 1. Delete active observation session if it exists
    await supabase
      .from('active_observations')
      .delete()
      .eq('agent_name', agent);

    // 2. Insert the final observation
    const { data, error } = await supabase
      .from('observations')
      .insert({
        agent_name: agent,
        coach_name: normalizeName(body.coachName),
        department: body.department,
        date: body.date,
        session_type: body.sessionType,
        categories: body.categories,
        rating: body.rating,
        observed_by: body.observedBy,
        duration: body.duration,
        // ... map other fields as needed
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE OBSERVATIONS: Bulk deletion support.
 */
export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) throw new Error("IDs array required");

    const { error } = await supabase
      .from('observations')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

