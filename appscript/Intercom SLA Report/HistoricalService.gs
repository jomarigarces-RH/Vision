/**
 * HistoricalService.gs — Handles bulk retrieval and caching of Intercom data.
 */

/**
 * Runs a bulk import for a specific date range.
 * Fetches data in daily chunks to avoid API limits.
 */
function runBulkImport(startDateStr, endDateStr) {
  var start = new Date(startDateStr);
  var end = new Date(endDateStr);
  var token = getIntercomToken();
  if (!token) return;
  
  var current = new Date(start);
  var totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  var processed = 0;

  while (current <= end) {
    var dateStr = Utilities.formatDate(current, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    try {
      var metrics = fetchIntercomMetricsForDate(dateStr);
      saveToHistoricalCache(dateStr, metrics);
      processed++;
      // Optional: Update a progress property for the UI to poll
      PropertiesService.getScriptProperties().setProperty('IMPORT_PROGRESS', Math.round((processed / totalDays) * 100));
    } catch (e) {
      Logger.log("Error importing " + dateStr + ": " + e.message);
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  PropertiesService.getScriptProperties().deleteProperty('IMPORT_PROGRESS');
  return { success: true, processed: processed };
}

/**
 * Saves metrics to the historical cache sheet.
 */
function saveToHistoricalCache(dateStr, metrics) {
  var ss = getDbSpreadsheet();
  var sheet = ss.getSheetByName('Historical_Cache') || ss.insertSheet('Historical_Cache');
  
  // Set headers if new
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Date', 'MetricsJSON', 'LastUpdated']);
  }
  
  // Find existing row for this date
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === dateStr || (data[i][0] instanceof Date && Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd") === dateStr)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowData = [dateStr, JSON.stringify(metrics), new Date()];
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, 3).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

/**
 * Retrieves metrics from the cache for a date range.
 */
function getCachedMetricsForRange(startStr, endStr) {
  var ss = getDbSpreadsheet();
  var sheet = ss.getSheetByName('Historical_Cache');
  if (!sheet) return null;
  
  var data = sheet.getDataRange().getValues();
  var start = new Date(startStr);
  var end = new Date(endStr);
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var d = new Date(data[i][0]);
    if (d >= start && d <= end) {
      result.push(JSON.parse(data[i][1]));
    }
  }
  
  return result.length > 0 ? result : null;
}

function getImportProgress() {
  return PropertiesService.getScriptProperties().getProperty('IMPORT_PROGRESS');
}
