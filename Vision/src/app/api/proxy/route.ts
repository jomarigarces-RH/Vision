import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Cache the response in Vercel Edge Network for 60 seconds
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "observations.list") {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      // Map keys to maintain frontend compatibility (optional but recommended)
      const mappedData = data.map((o: any) => ({
        ...o,
        _id: o.id,
        agentName: o.agent_name,
        coachName: o.coach_name,
        orderNumber: o.order_number,
        sessionType: o.session_type,
        overallRating: o.overall_rating,
        observedBy: o.observed_by,
        syncId: o.sync_id
      }));

      return NextResponse.json(mappedData);
    }
    
    if (action === "observations.getObservedAgents") {
      const sinceDate = searchParams.get("sinceDate");
      const endDate = searchParams.get("endDate");
      
      let query = supabase.from("observations").select("agent_name");
      
      if (sinceDate) query = query.gte("date", sinceDate);
      if (endDate) query = query.lte("date", endDate);
      
      const { data, error } = await query;
      if (error) throw error;

      const agentNames = Array.from(new Set(data.map((o: any) => o.agent_name)));
      return NextResponse.json(agentNames);
    }

    if (action === "staff.list") {
      const { data, error } = await supabase.from("staff").select("*").order("agent_name");
      if (error) throw error;

      const mappedData = data.map((s: any) => ({
        ...s,
        _id: s.id,
        agentName: s.agent_name,
        coachName: s.coach_name
      }));

      return NextResponse.json(mappedData);
    }

    if (action === "staff.listCoaches") {
      const { data, error } = await supabase.from("staff").select("coach_name, lob");
      if (error) throw error;

      const map = new Map<string, string>();
      for (const row of (data || [])) {
        if (!map.has(row.coach_name)) map.set(row.coach_name, row.lob);
      }
      const coaches = Array.from(map.entries()).map(([name, lob]) => ({ name, lob }));
      
      return NextResponse.json(coaches);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Proxy Action Error:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

