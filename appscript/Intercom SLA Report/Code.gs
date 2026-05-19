/**
 * Intercom SLA Report — Standalone Apps Script Web App
 * ====================================================
 * Real-time Operations & Workforce Metrics Dashboard
 * 
 * Data is sourced from Google Drive spreadsheet files:
 *   - 00 Voice Metrics  → Voice inbound, abandoned, AHT, queue, missed, AAT, hold time
 *   - 01 Chat SLA       → Chat inbound, SLA %, FRT, AHT, queue avg
 *   - 02 Voice SLA      → Voice SLA % (75s queue-time threshold)
 *   - 03 Email Productivity → Closed, assigned, replied, sent + top agents
 *
 * Backend extraction logic is in DataService.gs.
 * Client calls google.script.run.fetchSLAData(dateStr) to pull live data.
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Intercom SLA Report')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Save the current dashboard state so the next user sees the same view.
 * Stored in ScriptProperties (shared across all users).
 */
function saveAppState(state) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('dashboardState', JSON.stringify(state));
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
  var sheet = SpreadsheetApp.openById('1x5P-0ZHbVvl7TJeEN2Q-iSyn9JfaKrwLCPF6leFixXQ');
  var d = DriveApp.getFiles();
  Logger.log("Successfully connected to sheet: " + sheet.getName());
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
