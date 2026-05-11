import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const INITIAL_USERS = [
  { name: "Alyssa Reyes", email: "alyssar@residenthome.com" },
  { name: "Charbel Mahinay", email: "charbel.mahinay@residenthome.com" },
  { name: "Chui Goh", email: "chui.goh@residenthome.com" },
  { name: "Elaine Roxas", email: "elaine.roxas@residenthome.com" },
  { name: "Erwin Verano", email: "erwin.verano@residenthome.com" },
  { name: "Gazelle Bulalacao", email: "gazelleb@residenthome.com" },
  { name: "Irene Estravela", email: "irenee@residenthome.com" },
  { name: "JM Piñero", email: "joemari.pinero@residenthome.com" },
  { name: "Joenesse Bonghanoy", email: "joenesse.bonghanoy@residenthome.com" },
  { name: "John Ortega", email: "johno@residenthome.com" },
  { name: "Karl Mag-usara", email: "karl.magusara@residenthome.com" },
  { name: "Korina Alcantara", email: "korinaa@residenthome.com" },
  { name: "Krizha Abia", email: "krishias@residenthome.com" },
  { name: "Kyla Serion", email: "kylas@residenthome.com" },
  { name: "Mikaela Barrera", email: "mikaela.barrera@residenthome.com" },
  { name: "Maria Buenviaje", email: "mariab@residenthome.com" },
  { name: "May-Ann Montegrejo", email: "mayann.montegrejo@residenthome.com" },
  { name: "Shanne Diputado", email: "shanne.diputado@residenthome.com" },
  { name: "Xavy Cuerpo", email: "xavierc@residenthome.com" },
  { name: "Zaira Kinol", email: "zaira.kinol@residenthome.com" },
  { name: "Jake Cajes", email: "jakec@residenthome.com" },
  { name: "Shiela Bologa", email: "shielab@residenthome.com" },
  { name: "Maeu Canlas", email: "maeu.canlas@residenthome.com" },
  { name: "Van Tianero", email: "vant@residenthome.com" },
  { name: "Chie Tiu", email: "chiet@residenthome.com" },
  { name: "John Tagac", email: "johnt@residenthome.com" },
  { name: "Melrose Baybay", email: "melrose.baybay@residenthome.com" },
  { name: "Darwin Capitan", email: "darwin.capitan@residenthome.com" },
  { name: "Monlito Sarming", email: "mon.sarming@residenthome.com" },
  { name: "Riconi Rosales", email: "riconi.rosales@residenthome.com" },
  { name: "Carl Flores", email: "carl.flores@residenthome.com" },
  { name: "Julie Gumahad", email: "julie.gumahad@residenthome.com" },
  { name: "Shania Espina", email: "shania.espina@residenthome.com" },
  { name: "Jomari Garces", email: "jomari.garces@residenthome.com" },
];

/**
 * Migration to seed the users table with the staff list.
 */
export const seedUsers = mutation({
  handler: async (ctx) => {
    for (const user of INITIAL_USERS) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", user.email))
        .unique();
      
      if (!existing) {
        await ctx.db.insert("users", {
          ...user,
          role: user.name === "Jomari Garces" ? "admin" : "user",
          isFirstLogin: true,
          defaultView: "Past week",
          timezone: "UTC",
        });
      } else {
        await ctx.db.patch(existing._id, {
          role: user.name === "Jomari Garces" ? "admin" : "user",
          defaultView: existing.defaultView || "Past week",
          timezone: existing.timezone || "UTC",
        });
      }
    }
    return { success: true, count: INITIAL_USERS.length };
  },
});

/**
 * Checks if an email is registered and if they need to set up a password.
 */
export const checkEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();
    
    if (!user) return { exists: false };
    if (user.isRevoked) throw new Error("Access has been revoked. Contact Admin.");
    
    return {
      exists: true,
      name: user.name,
      role: user.role,
      isFirstLogin: user.isFirstLogin,
      securityQuestion: user.securityQuestion,
      preferences: {
        timezone: user.timezone,
        avatar: user.avatar,
        defaultView: user.defaultView,
      }
    };
  },
});

/**
 * Registers a password and security question for first-time users.
 */
export const registerUser = mutation({
  args: { 
    email: v.string(), 
    password: v.string(),
    securityQuestion: v.string(),
    securityAnswer: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    await ctx.db.patch(user._id, {
      password: args.password,
      securityQuestion: args.securityQuestion,
      securityAnswer: args.securityAnswer.toLowerCase().trim(),
      isFirstLogin: false,
    });
    
    return { success: true };
  },
});

/**
 * Verifies password for login.
 */
export const loginUser = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();
    
    if (!user || user.isFirstLogin) throw new Error("Invalid login");
    if (user.isRevoked) throw new Error("Access revoked");
    if (user.password !== args.password) throw new Error("Incorrect password");
    
    return { 
      success: true, 
      user: { 
        name: user.name, 
        email: user.email, 
        role: user.role,
        preferences: {
          timezone: user.timezone,
          avatar: user.avatar,
          defaultView: user.defaultView,
        }
      } 
    };
  },
});

/**
 * Resets password using security question.
 */
export const resetWithSecurity = mutation({
  args: { email: v.string(), securityAnswer: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();
    
    if (!user) throw new Error("User not found");
    if (user.isRevoked) throw new Error("Access revoked");
    if (!user.securityAnswer) throw new Error("No security question set up");
    if (user.securityAnswer !== args.securityAnswer.toLowerCase().trim()) throw new Error("Incorrect security answer");

    await ctx.db.patch(user._id, {
      password: args.newPassword,
    });
    
    return { success: true };
  },
});


/**
 * Update user profile or preferences
 */
export const updateSettings = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    defaultView: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .unique();
    if (!user) throw new Error("User not found");

    const { email, ...updates } = args;
    await ctx.db.patch(user._id, updates);
    return { success: true };
  },
});

/**
 * ADMIN: List all users
 */
export const listUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * ADMIN: Manage user access
 */
export const manageUser = mutation({
  args: { 
    userId: v.id("users"), 
    action: v.string(), // "revoke" | "restore" | "resetPassword" | "makeAdmin"
    newValue: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (args.action === "revoke") await ctx.db.patch(args.userId, { isRevoked: true });
    if (args.action === "restore") await ctx.db.patch(args.userId, { isRevoked: false });
    if (args.action === "makeAdmin") await ctx.db.patch(args.userId, { role: "admin" });
    if (args.action === "resetPassword") await ctx.db.patch(args.userId, { isFirstLogin: true, password: undefined });

    return { success: true };
  },
});
