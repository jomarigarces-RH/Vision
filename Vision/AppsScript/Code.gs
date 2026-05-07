/**
 * Google Apps Script to sync spreadsheet data to Convex.
 * Replace CONVEX_URL with your deployment URL (e.g. https://happy-monkey-123.convex.site)
 */

const CONVEX_URL = "https://earnest-rat-803.convex.site";

/**
 * Automatically sets up a 1-hour trigger for syncing.
 * Run this function ONCE from the script editor to start the automation.
 */
function setupAutomatedSync() {
  // Remove existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  
  // Create a new trigger that runs every hour
  ScriptApp.newTrigger('syncDataToConvex')
      .timeBased()
      .everyHours(1)
      .create();
      
  console.log("🚀 Automated 1-hour sync has been enabled!");
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Vision Sync')
      .addItem('Sync All Data Now', 'syncDataToConvex')
      .addSeparator()
      .addItem('Enable 1-Hour Auto-Sync', 'setupAutomatedSync')
      .addToUi();
}

function syncDataToConvex() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return; // Nothing to sync

  // BANDWIDTH OPTIMIZATION:
  // Instead of processing the whole sheet, we look at the last 200 rows.
  // Most edits and new entries happen at the bottom. 
  // This drastically reduces the data sent over the wire.
  const startRow = Math.max(2, lastRow - 200);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 14).getValues();
  
  const batchSize = 50;

  // Prepare data (No longer fetching IDs from Convex to save bandwidth)
  const observations = data.map((row, index) => {
    const agentName = String(row[3]);
    const dateStr = formatDate(row[1]);
    const orderNumber = String(row[12]);
    
    // Fingerprint based on entire row for edit detection
    const fingerprintRaw = row.map(cell => String(cell)).join("|");
    const syncId = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, fingerprintRaw)
                   .map(function(byte) {
                     return ('0' + (byte & 0xFF).toString(16)).slice(-2);
                   }).join('');

    return {
      department: [String(row[0])], 
      date: dateStr,     
      coachName: String(row[2]),    
      agentName: agentName,    
      sessionType: [String(row[4])],
      categories: [String(row[5])], 
      strengths: String(row[6]),    
      areasOfOpportunity: String(row[7]), 
      rootCause: String(row[8]),    
      actionPlan: String(row[9]),   
      overallRating: [String(row[10])], 
      otherFeedback: String(row[11]), 
      orderNumber: orderNumber,   
      teamLeadFeedback: String(row[13]),
      syncId: syncId
    };
  }).filter(obs => obs.agentName && obs.agentName.trim() !== "" && obs.date && obs.date.trim() !== "");

  if (observations.length === 0) return;

  // Send rows in batches
  for (let i = 0; i < observations.length; i += batchSize) {
    const batch = observations.slice(i, i + batchSize);
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ observations: batch }),
      muteHttpExceptions: true
    };
    
    try {
      UrlFetchApp.fetch(`${CONVEX_URL}/sync-sheet`, options);
    } catch (e) {
      console.error("Sync error: " + e.message);
    }
  }
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal);
}
