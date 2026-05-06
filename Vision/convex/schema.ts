import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  observations: defineTable({
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
    duration: v.optional(v.number()), // Duration in seconds
  })
    .index("by_agent", ["agentName"])
    .index("by_coach", ["coachName"])
    .index("by_date", ["date"]),

  active_observations: defineTable({
    agentName: v.string(),
    coachName: v.string(),
    startTime: v.number(), // timestamp
  })
    .index("by_coach", ["coachName"])
    .index("by_agent", ["agentName"]),
});
