import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { AGENTS, COACHES } from "./constants";

// Helper for fuzzy matching names
function resolveName(shortName: string, list: string[]) {
  if (!shortName) return null;
  
  const exactMappings: Record<string, string> = {
    '@edmar baylon': 'Edmar Muyco Baylon',
    '@jimgirl corciega': 'Jimboy Tortusa Corciega',
    '@ej samson': 'Ej Gabrielle Samson Fua',
    '@lyndel verzano': 'Lyndel Mae Baguio Verzano',
    '@shanne diputado': 'Shanne Juliet Credo Diputado',
    '@erwin verano': 'Erwin Verano',
    '@felrose magalso': 'Felrose Quisel Magalso'
  };

  const raw = shortName.trim().toLowerCase();
  if (exactMappings[raw]) {
    // Return the mapped name if it exists in the provided list, otherwise return the mapped string directly
    const found = list.find(full => full.toLowerCase() === exactMappings[raw].toLowerCase());
    if (found) return found;
    return exactMappings[raw]; 
  }

  const clean = shortName.replace('@', '').toLowerCase().trim();
  const parts = clean.split(' ').filter(p => p.length > 0);
  return list.find(full => {
    const fClean = full.toLowerCase();
    return parts.every(p => fClean.includes(p));
  });
}

function mapRating(ratingStr: string) {
  const r = (ratingStr || "").toLowerCase();
  if (r.includes('exceed')) return 100;
  if (r.includes('meets')) return 85;
  if (r.includes('needs')) return 60;
  return 80;
}

// Save a new observation
export const create = mutation({
  args: {
    agentName: v.string(),
    coachName: v.string(),
    department: v.array(v.string()),
    otherDepartment: v.optional(v.string()),
    date: v.string(),
    sessionType: v.array(v.string()),
    categories: v.array(v.string()),
    otherCategory: v.optional(v.string()),
    strengths: v.optional(v.string()),
    areasOfOpportunity: v.optional(v.string()),
    rootCause: v.optional(v.string()),
    actionPlan: v.optional(v.string()),
    overallRating: v.array(v.string()),
    otherFeedback: v.optional(v.string()),
    orderNumber: v.optional(v.string()),
    teamLeadFeedback: v.optional(v.string()),
    rating: v.number(),
    observedBy: v.string(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If there's an active observation for this agent, remove it
    const active = await ctx.db
      .query("active_observations")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .unique();
    
    if (active) {
      await ctx.db.delete(active._id);
    }

    return await ctx.db.insert("observations", args);
  },
});

// Start an observation
export const start = mutation({
  args: {
    agentName: v.string(),
    coachName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already observing
    const existing = await ctx.db
      .query("active_observations")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .unique();
    
    if (existing) return existing._id;

    return await ctx.db.insert("active_observations", {
      agentName: args.agentName,
      coachName: args.coachName,
      startTime: Date.now(),
    });
  },
});

// List active observations
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("active_observations").collect();
  },
});

// Get active observation for an agent
export const getActiveForAgent = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("active_observations")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .unique();
  },
});

// Get all observations
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("observations").order("desc").collect();
  },
});

// Get observations for a specific agent
export const getByAgent = query({
  args: { agentName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("observations")
      .withIndex("by_agent", (q) => q.eq("agentName", args.agentName))
      .collect();
  },
});

// Get observations for a specific coach's agents
export const getByCoach = query({
  args: { coachName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("observations")
      .withIndex("by_coach", (q) => q.eq("coachName", args.coachName))
      .collect();
  },
});

// Get observed agent names in a specific date range
export const getObservedAgents = query({
  args: { 
    sinceDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let observations;
    
    if (args.sinceDate && args.endDate) {
      observations = await ctx.db.query("observations").withIndex("by_date", (idx) => 
        idx.gte("date", args.sinceDate!).lte("date", args.endDate!)
      ).collect();
    } else if (args.sinceDate) {
      observations = await ctx.db.query("observations").withIndex("by_date", (idx) => 
        idx.gte("date", args.sinceDate!)
      ).collect();
    } else if (args.endDate) {
      observations = await ctx.db.query("observations").withIndex("by_date", (idx) => 
        idx.lte("date", args.endDate!)
      ).collect();
    } else {
      observations = await ctx.db.query("observations").collect();
    }

    const agentNames = new Set(observations.map((o) => o.agentName));
    return Array.from(agentNames);
  },
});

export const importBatch = mutation({
  args: {
    observations: v.array(v.object({
      agentName: v.string(),
      coachName: v.string(),
      department: v.array(v.string()),
      date: v.string(),
      sessionType: v.array(v.string()),
      categories: v.array(v.string()),
      strengths: v.optional(v.string()),
      areasOfOpportunity: v.optional(v.string()),
      rootCause: v.optional(v.string()),
      actionPlan: v.optional(v.string()),
      overallRating: v.array(v.string()),
      otherFeedback: v.optional(v.string()),
      orderNumber: v.optional(v.string()),
      teamLeadFeedback: v.optional(v.string()),
      rating: v.optional(v.number()),
      ratingString: v.optional(v.string()),
      observedBy: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    for (const obs of args.observations) {
      const agent = resolveName(obs.agentName, AGENTS) || obs.agentName;
      const coach = resolveName(obs.coachName, COACHES) || obs.coachName;
      const rating = obs.rating ?? mapRating(obs.ratingString || "");

      await ctx.db.insert("observations", {
        ...obs,
        agentName: agent,
        coachName: coach,
        rating: rating,
        observedBy: obs.observedBy || coach,
        // Remove ratingString as it's not in the schema
        ratingString: undefined,
      } as any);
    }
  },
});

export const deleteMany = mutation({
  args: { ids: v.array(v.id("observations")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

export const syncToGoogleSheet = action({
  args: { payload: v.string() },
  handler: async (ctx, args) => {
    const GOOGLE_WEB_APP_URL = "https://script.google.com/a/macros/residenthome.com/s/AKfycbytg3mR_q3gBaVRhH8UIfuNb1hYUFvew5WuzJ1DQsAD7nv0Pw7y6c13VHd0QjqbgsLQ/exec";
    try {
      const res = await fetch(GOOGLE_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: args.payload
      });
      if (!res.ok) {
        throw new Error(`Google Sheets responded with status: ${res.status}`);
      }
      return await res.text();
    } catch (err: any) {
      console.error("Sync failed:", err.message || err);
      return `Action failed: ${err.message || err}`;
    }
  }
});
