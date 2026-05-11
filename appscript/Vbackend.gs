/**
 * Vbackend.gs — Vercel Backend Logic Reference
 * =============================================
 * This file documents the Vercel/Next.js API layer logic
 * that sits between the frontend and Convex.
 *
 * In the Vercel app, this logic lives in:
 *   - src/app/api/proxy/route.ts → Cached API proxy
 *   - Vision/AppsScript/Code.gs  → Sheet→Convex sync trigger
 *
 * The Vercel proxy exists to reduce Convex bandwidth:
 *   Instead of the frontend hitting Convex directly for every page load,
 *   Vercel caches the response for 60 seconds (revalidate = 60).
 *
 * DATA FLOW:
 *   Google Sheet → (AppsScript sync every 1hr) → Convex DB
 *   Convex DB → (Vercel proxy, cached 60s) → Next.js Frontend
 *
 * For the Apps Script version, we bypass ALL of this:
 *   Google Sheet → (direct read) → Apps Script Frontend
 *   Zero Convex bandwidth. Zero Vercel bandwidth.
 */

// ── VERCEL PROXY ENDPOINTS ───────────────────────────────────
// Source: src/app/api/proxy/route.ts
//
// The proxy supports these actions via query parameter:
//   GET /api/proxy?action=observations.list
//     → Returns all observations from Convex
//
//   GET /api/proxy?action=observations.getObservedAgents&sinceDate=...&endDate=...
//     → Returns observed agent names within a date range
//
//   GET /api/proxy?action=staff.list
//     → Returns all staff (agent + coach + LOB) from Convex
//
//   GET /api/proxy?action=staff.listCoaches
//     → Returns unique coaches with their LOB
//
// Cache: Vercel Edge Network caches for 60 seconds (revalidate = 60)
// This means the dashboard data is at most 60 seconds stale.

// ── SHEET SYNC (AppsScript → Convex) ─────────────────────────
// Source: Vision/AppsScript/Code.gs
//
// The sync script runs every 1 hour via a time-driven trigger.
// It reads the last 200 rows from the spreadsheet, computes an
// MD5 fingerprint for each row (syncId), and POSTs batches of 50
// observations to the Convex HTTP endpoint:
//   POST https://earnest-rat-803.convex.site/sync-sheet
//
// The fingerprint ensures:
//   - New rows are inserted
//   - Edited rows are updated (fingerprint changes)
//   - Duplicate rows are skipped (same fingerprint)

// ── CONVEX HTTP ENDPOINT ─────────────────────────────────────
// Source: convex/http.ts
//
// Receives POST /sync-sheet with body:
//   { observations: [{ department, date, coachName, agentName, ... }] }
//
// For each observation:
//   1. Normalizes agent and coach names (strips @, resolves nicknames)
//   2. Checks if a record with the same syncId already exists
//   3. If not, inserts the observation AND upserts the staff table
//   4. The staff upsert ensures every unique agent→coach→LOB mapping
//      is recorded, even if no prior seed data existed.

// ── APPS SCRIPT EQUIVALENT ───────────────────────────────────
// In this Apps Script version, we replicate the entire pipeline
// with a single function: Code.gs → getAllObservations()
//
// Instead of Sheet → Sync → Convex → Proxy → Frontend,
// we do: Sheet → getAllObservations() → Frontend
//
// The normalizeName() function from Cbackend.gs handles the
// nickname resolution that Convex does server-side.

/**
 * Equivalent of the Vercel proxy cache:
 * Apps Script has a built-in CacheService that can store
 * serialized data for up to 6 hours, reducing Sheet reads.
 */
function getCachedObservations() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('allObservations');

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Cache corrupted, fall through to fresh read
    }
  }

  // Fresh read from sheet
  var data = getAllObservations();

  // Cache for 5 minutes (300 seconds) — similar to Vercel's 60s revalidate
  // but longer since Apps Script has higher latency per read
  try {
    cache.put('allObservations', JSON.stringify(data), 300);
  } catch (e) {
    // Data too large for cache (100KB limit), skip caching
  }

  return data;
}

/**
 * Invalidates the cached data.
 * Call this after the sheet is updated to force a fresh read.
 */
function invalidateCache() {
  var cache = CacheService.getScriptCache();
  cache.remove('allObservations');
}
