/**
 * Resident Home — Vision (Apps Script Edition)
 * Full-featured Coaching & Observation Dashboard
 * Reads data directly from the Google Sheet — zero Convex bandwidth usage.
 */

// Dummy function to force authorization for Sheets and Drive
function forceAuth() {
  SpreadsheetApp.getActiveSpreadsheet();
  DriveApp.getFileById("1F0blS0Anw4Q2o2FG3glkV2mlZM_pvkXU9GpFhBlVda4");
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Resident Home — Vision')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns ALL observations from the sheet as structured objects.
 */
function getAllObservations() {
  var ss;
  try {
    // Standalone script needs to open by ID
    ss = SpreadsheetApp.openById("1F0blS0Anw4Q2o2FG3glkV2mlZM_pvkXU9GpFhBlVda4");
    if (!ss) throw new Error("Could not open spreadsheet with ID 1F0blS0Anw4Q2o2FG3glkV2mlZM_pvkXU9GpFhBlVda4");
  } catch (e) {
    throw new Error("Cannot access Spreadsheet. Detail: " + e.message);
  }
  
  var sheets = ss.getSheets();
  var candidates = [];
  for (var s = 0; s < sheets.length; s++) {
    var name = sheets[s].getName();
    if (name.indexOf("Observations") !== -1 || name.indexOf("Form Responses") !== -1) {
      candidates.push(sheets[s]);
    }
  }
  
  var sheet = sheets[0];
  if (candidates.length > 0) {
    // Pick the one with the most rows
    candidates.sort(function(a, b) { return b.getLastRow() - a.getLastRow(); });
    sheet = candidates[0];
  }
  
  var data = sheet.getRange(1, 1, sheet.getLastRow(), 15).getValues(); // Get first 15 columns
  if (data.length <= 1) return [];

  var rows = data.slice(1);
  var observations = [];

  var specialtyTags = ['social', 'transit/review/wgs', 'oem', 'service recovery', 'marketplace'];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var agentName = normalizeName(row[3]);
    if (!agentName) continue;
    var coachName = normalizeName(row[2]);

    var rawDate = row[1];
    var dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    } else if (rawDate) {
      var d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = Utilities.formatDate(d, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
      } else {
        dateStr = String(rawDate).trim();
      }
    }
    
    if (!dateStr) dateStr = 'Unknown Date';

    // Map LOB
    var lob = String(row[0] || '').trim();
    if (specialtyTags.indexOf(lob.toLowerCase()) !== -1) {
      lob = 'Specialty';
    } else if (lob.toLowerCase() === 'support') {
      lob = 'Support';
    } else if (!lob) {
      lob = 'Sales';
    } else {
      // Capitalize first letter
      lob = lob.charAt(0).toUpperCase() + lob.slice(1);
    }

    // Map rating text to numeric percentage
    var ratingText = String(row[10] || '').toLowerCase();
    var numericRating = 80;
    if (ratingText.indexOf('exceed') !== -1) numericRating = 100;
    else if (ratingText.indexOf('meets') !== -1) numericRating = 85;
    else if (ratingText.indexOf('needs') !== -1) numericRating = 60;
    else if (ratingText.indexOf('below') !== -1) numericRating = 40;

    observations.push({
      _id: 'row_' + (i + 2),
      department: [lob],
      date: dateStr,
      coachName: coachName,
      agentName: agentName,
      sessionType: [String(row[4] || '')],
      categories: [String(row[5] || '')],
      strengths: String(row[6] || ''),
      areasOfOpportunity: String(row[7] || ''),
      rootCause: String(row[8] || ''),
      actionPlan: String(row[9] || ''),
      overallRating: [String(row[10] || '')],
      rating: numericRating,
      otherFeedback: String(row[11] || ''),
      orderNumber: String(row[12] || ''),
      teamLeadFeedback: String(row[13] || '')
    });
  }

  // Sort by date descending (most recent first), then by row index descending (latest in sheet first)
  observations.sort(function(a, b) {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    // Dates are equal, use row index from _id (format: row_N)
    var rowA = parseInt(a._id.split('_')[1]);
    var rowB = parseInt(b._id.split('_')[1]);
    return rowB - rowA;
  });

  return observations;
}

/**
 * Returns ALL initial data in one call to reduce latency.
 */
function getDashboardData() {
  var obs = getAllObservations();
  
  // Compute staff list
  var staffMap = {};
  for (var i = 0; i < obs.length; i++) {
    var o = obs[i];
    if (!staffMap[o.agentName]) {
      staffMap[o.agentName] = { name: o.agentName, coach: o.coachName, lob: o.department[0] };
    }
  }
  var staff = [];
  for (var key in staffMap) staff.push(staffMap[key]);
  staff.sort(function(a, b) { return a.name < b.name ? -1 : 1; });

  // Compute coaches list
  var coachMap = {};
  for (var j = 0; j < staff.length; j++) {
    var s = staff[j];
    if (s.coach && !coachMap[s.coach]) {
      coachMap[s.coach] = { name: s.coach, dept: s.lob };
    }
  }
  var coaches = [];
  for (var ckey in coachMap) coaches.push(coachMap[ckey]);
  coaches.sort(function(a, b) { return a.name < b.name ? -1 : 1; });

  return {
    observations: obs,
    staff: staff,
    coaches: coaches
  };
}

function getStaffList() { return getDashboardData().staff; }
function getCoachesList() { return getDashboardData().coaches; }
