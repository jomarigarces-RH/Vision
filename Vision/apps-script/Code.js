/**
 * Resident Vision Live Sync (Full Automation)
 * Endpoint: https://earnest-rat-803.convex.site/sync-sheet
 */
const CONVEX_WEBHOOK_URL = "https://earnest-rat-803.convex.site/sync-sheet";

/**
 * INSTALLABLE TRIGGER: Set this to run "On Change" or "On Form Submit"
 */
function handleAutoSync(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rowIndex = sheet.getActiveCell().getRow();
  
  if (rowIndex > 1) {
    const rowData = getRowData(sheet, rowIndex);
    // Only sync if row has a real agent name and LOB to prevent partial edits from sending junk
    if (rowData.agentName && rowData.agentName.trim() !== "" && rowData.department[0] && rowData.department[0].trim() !== "") {
      sendToConvex(rowData);
    }
  }
}

function getRowData(sheet, rowIndex) {
  const range = sheet.getRange(rowIndex, 1, 1, 14); // Columns A to N
  const values = range.getValues()[0];
  
  // Prevent 1970 date bugs by checking if value exists
  const rawDate = values[1];
  const formattedDate = rawDate ? Utilities.formatDate(new Date(rawDate), "GMT+8", "yyyy-MM-dd") : Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  
  // Map legacy LOBs to "Specialty"
  let lob = String(values[0] || "").trim();
  const specialtyTags = ["social", "transit/review/wgs", "oem", "service recovery", "marketplace"];
  if (specialtyTags.includes(lob.toLowerCase())) {
    lob = "Specialty";
  } else if (!lob) {
    lob = "Sales"; // Default fallback
  }

  return {
    department: [lob], // Col A: LOB mapped correctly
    date: formattedDate, // Col B: Date
    coachName: String(values[2]), // Col C: Coach
    agentName: String(values[3]), // Col D: Agent
    sessionType: [String(values[4])], // Col E: Session Type
    categories: [String(values[5])], // Col F: Categories
    strengths: String(values[6]),
    areasOfOpportunity: String(values[7]),
    rootCause: String(values[8]),
    actionPlan: String(values[9]),
    overallRating: [String(values[10])], // Col K mapping required by schema
    ratingString: String(values[10]), // Col K: Rating string
    otherFeedback: String(values[11]),
    orderNumber: String(values[12]),
    teamLeadFeedback: String(values[13])
  };
}

function sendToConvex(data) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data)
  };
  UrlFetchApp.fetch(CONVEX_WEBHOOK_URL, options);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🚀 Vision Sync')
      .addItem('Sync Selected Row', 'handleAutoSync')
      .addItem('Bulk Sync History', 'bulkSyncAll')
      .addToUi();
}

function bulkSyncAll() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const batch = [];
  for (let i = 2; i <= lastRow; i++) {
    const rowData = getRowData(sheet, i);
    // CRITICAL: Skip empty rows
    if (!rowData.agentName || rowData.agentName.trim() === "") continue;
    
    batch.push(rowData);
    if (batch.length >= 50) {
      sendToConvex(batch);
      batch.length = 0;
    }
  }
  if (batch.length > 0) sendToConvex(batch);
  SpreadsheetApp.getUi().alert("Bulk Sync Complete!");
}
