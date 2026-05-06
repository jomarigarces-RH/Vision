import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("observations", args);
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

// Get all observed agent names (for tracking completion)
export const getObservedAgents = query({
  args: {},
  handler: async (ctx) => {
    const observations = await ctx.db.query("observations").collect();
    const agentNames = new Set(observations.map((o) => o.agentName));
    return Array.from(agentNames);
  },
});
