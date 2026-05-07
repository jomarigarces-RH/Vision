import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "Vision Sync is Live" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/sync-sheet",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const data = await request.json();
    console.log("Received Sync Request");
    
    // Handle both { observations: [...] } and raw [...] formats
    const observations = data.observations || (Array.isArray(data) ? data : [data]);

    try {
      // Use batchSync which has the duplicate check logic
      await ctx.runMutation(internal.observations.batchSync, { observations });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Sheet Sync Error:", err);
      return new Response(JSON.stringify({ success: false, error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
