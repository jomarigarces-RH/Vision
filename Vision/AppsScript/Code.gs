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
  
  const rows = data.slice(1); // Skip headers
  const batchSize = 50;
  let totalSynced = 0;
  
  const ui = SpreadsheetApp.getUi();
  
  // 1. Prepare and filter all data
  const allObservations = rows.map((row, index) => {
    const obs = {
      department: [String(row[0])], 
      date: formatDate(row[1]),     
      coachName: String(row[2]),    
      agentName: String(row[3]),    
      sessionType: [String(row[4])],
      categories: [String(row[5])], 
      strengths: String(row[6]),    
      areasOfOpportunity: String(row[7]), 
      rootCause: String(row[8]),    
      actionPlan: String(row[9]),   
      overallRating: [String(row[10])], 
      otherFeedback: String(row[11]), 
      orderNumber: String(row[12]),   
      teamLeadFeedback: String(row[13]) 
    };
    return obs;
  }).filter(obs => {
    const isValid = obs.agentName && obs.agentName.trim() !== "" && obs.date && obs.date.trim() !== "";
    if (isValid) totalSynced++;
    return isValid;
  });

  if (allObservations.length === 0) {
    return;
  }

  // 2. Send in batches
  for (let i = 0; i < allObservations.length; i += batchSize) {
    const batch = allObservations.slice(i, i + batchSize);

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ observations: batch })
    };
    
    try {
      const response = UrlFetchApp.fetch(`${CONVEX_URL}/sync-sheet`, options);
      const result = JSON.parse(response.getContentText());
      if (!result.success) throw new Error(result.error);
    } catch (e) {
      return;
    }
  }
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal);
}
