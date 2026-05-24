/**
 * Intercom SLA Report — Standalone Apps Script Web App
 * ====================================================
 * 
 * 🛠️ CONFIGURATION:
 * Paste your Intercom Access Token below:
 */
var CONST_INTERCOM_TOKEN = 'PASTE_YOUR_TOKEN_HERE';

function getIntercomToken() {
  if (CONST_INTERCOM_TOKEN && CONST_INTERCOM_TOKEN !== 'PASTE_YOUR_TOKEN_HERE' && CONST_INTERCOM_TOKEN.length > 10) {
    return CONST_INTERCOM_TOKEN;
  }
  return PropertiesService.getScriptProperties().getProperty('INTERCOM_TOKEN');
}

/**
 * Data is sourced from Google Drive spreadsheet files or Intercom API.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Intercom SLA Report')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Handle incoming webhooks from Intercom (Option 3).
 * Must be deployed as a Web App with access 'Anyone'.
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) return ContentService.createTextOutput("OK");
    var postData = JSON.parse(e.postData.contents);
    if (postData && postData.topic) processIntercomWebhook(postData);
    return ContentService.createTextOutput("OK");
  } catch (error) {
    return ContentService.createTextOutput("OK");
  }
}

/**
 * TRIGGER-BASED SYNC
 * Call this every 15 minutes to pull the latest data from Intercom.
 */
function syncLiveData() {
  var token = getIntercomToken();
  if (!token) return;

  var today = Utilities.formatDate(new Date(), "America/New_York", "yyyy-MM-dd");
  Logger.log("Running scheduled sync for " + today);
  
  try {
    var metrics = fetchIntercomMetricsForDate(today);
    saveToHistoricalCache(today, metrics);
    Logger.log("Sync successful.");
  } catch(e) {
    Logger.log("Sync failed: " + e.message);
  }
}

/**
 * Run this once manually to start the 15-minute background sync.
 */
function setupAutomatedSync() {
  // Delete existing triggers first
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncLiveData') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create new 1-minute trigger
  ScriptApp.newTrigger('syncLiveData')
    .timeBased()
    .everyMinutes(1)
    .create();
    
  Logger.log("Automated sync established. Dashboard will update every 15 minutes.");
}

function getWebhookInfo() {
  var url = ScriptApp.getService().getUrl();
  return {
    url: url,
    isDev: url.indexOf('/dev') !== -1,
    tip: "Use the EXEC URL (not /dev) in Intercom Developers Hub > Webhooks."
  };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Centralized DB Sheet Handler for standalone execution.
 */
function getDbSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DB_SHEET_ID');
  
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch(e) {
      Logger.log("DB Sheet ID stale. Creating new one...");
    }
  }
  
  var ss = SpreadsheetApp.create('Intercom_SLA_Dashboard_DB');
  props.setProperty('DB_SHEET_ID', ss.getId());
  return ss;
}

/**
 * Save the current dashboard state so the next user sees the same view.
 */
function saveAppState(state) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('dashboardState', JSON.stringify(state));
}

function getWebhookInfo() {
  var url = ScriptApp.getService().getUrl();
  var token = getIntercomToken();
  return {
    url: url,
    hasToken: !!token
  };
}

// ===== INTERCOM INTEGRATION =====
function saveIntercomToken(token) {
  if (!token) return { success: false, message: "No token provided" };
  
  var props = PropertiesService.getScriptProperties();
  props.setProperty('INTERCOM_TOKEN', token);
  
  // Also verify it was saved
  var saved = props.getProperty('INTERCOM_TOKEN');
  if (saved === token) {
    Logger.log("Token saved successfully.");
    return { success: true, message: "Token verified and saved." };
  } else {
    return { success: false, message: "Save failed. Check permissions." };
  }
}

function getIntercomConfig() {
  var token = getIntercomToken();
  return {
    hasToken: !!token,
    tokenPreview: token ? token.slice(0, 4) + '...' + token.slice(-4) : ''
  };
}

/**
 * Load the last saved dashboard state.
 * Returns null if no state has been saved yet.
 */
function loadAppState() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('dashboardState');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Run this function once from the Apps Script Editor to force Google
 * to ask for permissions to read the new Absenteeism Google Sheet.
 */
function forceAuth() {
  // 1. Auth for Absenteeism Sheet
  var sheet = SpreadsheetApp.openById('1x5P-0ZHbVvl7TJeEN2Q-iSyn9JfaKrwLCPF6leFixXQ');
  
  // 2. Auth for Database Spreadsheet creation/access
  var db = getDbSpreadsheet();
  
  // 3. Auth for Drive access
  var d = DriveApp.getFiles();
  
  Logger.log("Successfully authorized everything!");
  Logger.log("Main DB ID: " + db.getId());
}

/**
 * Run this from the Apps Script Editor to:
 * 1. Force Google to grant UrlFetchApp permission (external HTTP)
 * 2. Test if your Intercom token is valid
 * 3. See the exact response in the Execution Log
 */
function testIntercomConnection() {
  var token = getIntercomToken();
  Logger.log("=== INTERCOM CONNECTION TEST ===");
  Logger.log("Token found: " + (token ? "YES (" + token.length + " chars)" : "NO"));
  
  if (!token) {
    Logger.log("ERROR: No token saved. Go to Control Panel > Update API Token first.");
    return;
  }
  
  Logger.log("Token preview: " + token.slice(0, 8) + "..." + token.slice(-4));

  var headers = {
    "Authorization": "Bearer " + token,
    "Accept": "application/json",
    "Intercom-Version": "2.10"
  };

  // TEST 1: /counts endpoint (requires "Read counts" scope — user has this)
  Logger.log("");
  Logger.log("--- TEST 1: /counts (Read counts scope) ---");
  try {
    var r1 = UrlFetchApp.fetch('https://api.intercom.io/counts', {
      method: "GET", headers: headers, muteHttpExceptions: true
    });
    Logger.log("Status: " + r1.getResponseCode());
    Logger.log("Response: " + r1.getContentText().substring(0, 300));
    if (r1.getResponseCode() === 200) Logger.log("✅ PASSED — Token is valid!");
    else Logger.log("❌ FAILED");
  } catch(e) { Logger.log("EXCEPTION: " + e.message); }

  // TEST 2: /conversations/search (requires "Read conversations" scope)
  Logger.log("");
  Logger.log("--- TEST 2: /conversations/search (Read conversations scope) ---");
  try {
    var now = Math.floor(Date.now() / 1000);
    var payload = {
      "query": {
        "operator": "AND",
        "value": [
          { "field": "created_at", "operator": ">", "value": now - 3600 },
          { "field": "created_at", "operator": "<", "value": now }
        ]
      },
      "pagination": { "per_page": 1 }
    };
    var r2 = UrlFetchApp.fetch('https://api.intercom.io/conversations/search', {
      method: "POST",
      contentType: "application/json",
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log("Status: " + r2.getResponseCode());
    var body2 = r2.getContentText();
    Logger.log("Response: " + body2.substring(0, 500));
    if (r2.getResponseCode() === 200) {
      var data = JSON.parse(body2);
      Logger.log("✅ PASSED — Found " + (data.total_count || 0) + " conversations in the last hour.");
    } else {
      Logger.log("❌ FAILED — You need to enable 'Read conversations' scope in Intercom Developer Hub.");
    }
  } catch(e) { Logger.log("EXCEPTION: " + e.message); }

  Logger.log("");
  Logger.log("=== TEST COMPLETE ===");
}


/**
 * Returns available subfolders for each of the 4 source drives.
 */
function getUploadFolders() {
  var sources = [
    { id: '1nCpKUUGt_1Sb2yg-j7QcYDaDf_5idvTc', type: 'Voice Metrics' },
    { id: '1dIZhVKT5QmjMVL3yl5cZZJQQ5qu3LxC5', type: 'Chat SLA' },
    { id: '1cI46hILQQb-g-8TfHgZQ6T1dhwtQun10', type: 'Voice SLA' },
    { id: '1HQqdau5ytSMnGBI_D-N6iCLpVgC2oaOn', type: 'Email Productivity' }
  ];
  
  var result = {};
  sources.forEach(function(s) {
    try {
      var folder = DriveApp.getFolderById(s.id);
      var subs = folder.getFolders();
      var list = [];
      while (subs.hasNext()) {
        var f = subs.next();
        list.push({ id: f.getId(), name: f.getName() });
      }
      list.sort(function(a, b) { return b.name.localeCompare(a.name); });
      result[s.type] = list;
    } catch(e) {
      result[s.type] = [];
    }
  });
  return result;
}

/**
 * Uploads a base64 encoded file into the specified Drive folder.
 */
function uploadFileToDrive(folderId, fileName, base64Data, mimeType) {
  var folder = DriveApp.getFolderById(folderId);
  
  // Trash existing files with the exact same name to prevent duplicates
  var existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }
  
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
  folder.createFile(blob);
  return { success: true, name: fileName };
}
