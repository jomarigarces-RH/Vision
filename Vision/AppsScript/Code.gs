/**
 * Google Apps Script to sync spreadsheet data to Convex.
 * Replace CONVEX_URL with your deployment URL (e.g. https://happy-monkey-123.convex.site)
 */

const CONVEX_URL = "https://earnest-rat-803.convex.site";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Vision Sync')
      .addItem('Sync All Data to Dashboard', 'syncDataToConvex')
      .addToUi();
}

function syncDataToConvex() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Assuming headers are in the first row
  const headers = data[0];
  const rows = data.slice(1);
  
  const observations = rows.map(row => {
    // Map columns based on Image 1: A=LOB, B=Date, C=Coach, D=Agent, etc.
    return {
      department: [String(row[0])], // Column A
      date: formatDate(row[1]),     // Column B
      coachName: String(row[2]),    // Column C
      agentName: String(row[3]),    // Column D
      sessionType: [String(row[4])],// Column E
      categories: [String(row[5])], // Column F
      strengths: String(row[6]),    // Column G
      areasOfOpportunity: String(row[7]), // Column H
      rootCause: String(row[8]),    // Column I
      actionPlan: String(row[9]),   // Column J
      overallRating: [String(row[10])], // Column K
      otherFeedback: String(row[11]), // Column L
      orderNumber: String(row[12]),   // Column M
      teamLeadFeedback: String(row[13]) // Column N
    };
  }).filter(obs => obs.agentName && obs.date); // Basic validation

  // Send to Convex
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ observations })
  };
  
  try {
    const response = UrlFetchApp.fetch(`${CONVEX_URL}/sync-sheet`, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      SpreadsheetApp.getUi().alert('✅ Sync Complete! ' + observations.length + ' rows processed.');
    } else {
      SpreadsheetApp.getUi().alert('❌ Sync Failed: ' + result.error);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Error: ' + e.toString());
  }
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal);
}
