import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  staff: defineTable({
    agentName: v.string(),
    nickname: v.optional(v.string()),
    coachName: v.string(),
    lob: v.string(), // Sales, Support, Specialty
  })
    .index("by_coach", ["coachName"])
    .index("by_lob", ["lob"])
    .index("by_agent", ["agentName"]),

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
    syncId: v.optional(v.string()), // Unique hash for deduplication
  })
    .index("by_agent", ["agentName"])
    .index("by_coach", ["coachName"])
    .index("by_date", ["date"])
    .index("by_sync_id", ["syncId"]),

  active_observations: defineTable({
    agentName: v.string(),
    coachName: v.string(),
    startTime: v.number(), // timestamp
  })
    .index("by_coach", ["coachName"])
    .index("by_agent", ["agentName"]),

  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()), // Null means first-time login
    name: v.string(),
    role: v.string(), // "admin" | "user"
    timezone: v.optional(v.string()),
    avatar: v.optional(v.string()), // URL or storage ID
    defaultView: v.optional(v.string()), // "Today", "This Week", etc.
    securityQuestion: v.optional(v.string()),
    securityAnswer: v.optional(v.string()),
    isFirstLogin: v.boolean(),
    isRevoked: v.optional(v.boolean()),
  }).index("by_email", ["email"]),
});
