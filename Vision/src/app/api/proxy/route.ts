import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Cache the response in Vercel Edge Network for 60 seconds
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    if (action === "observations.list") {
      const data = await convex.query(api.observations.list);
      return NextResponse.json(data);
    }
    
    if (action === "observations.getObservedAgents") {
      const sinceDate = searchParams.get("sinceDate") || undefined;
      const endDate = searchParams.get("endDate") || undefined;
      const data = await convex.query(api.observations.getObservedAgents, { sinceDate, endDate });
      return NextResponse.json(data);
    }

    if (action === "staff.list") {
      const data = await convex.query(api.staff.list);
      return NextResponse.json(data);
    }

    if (action === "staff.listCoaches") {
      const data = await convex.query(api.staff.listCoaches);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
