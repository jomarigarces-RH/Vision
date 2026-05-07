import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/sync-sheet",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const data = await request.json();
    
    // Google Sheets sends data as an array of rows or a single row object
    const observations = Array.isArray(data) ? data : [data];

    try {
      // Use batchSync which has the duplicate check logic
      await ctx.runMutation(api.observations.batchSync, { observations });
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
