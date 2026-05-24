import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * THIN READ: Fetch staff list with caching.
 * Uses Vercel Edge Caching to save Supabase bandwidth.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, agent_name, nickname, coach_name, lob') // Explicit columns = less bandwidth
      .order('agent_name');

    if (error) throw error;

    // Cache this response on Vercel Edge for 60 seconds
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * BULK UPSERT: Sync staff from external sources if needed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('staff')
      .upsert(body, { onConflict: 'agent_name' });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
