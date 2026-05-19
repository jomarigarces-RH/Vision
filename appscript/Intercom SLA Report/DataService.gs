/**
 * DataService.gs — Google Drive CSV Data Extraction
 * Supports single-date and date-range aggregation.
 * Files are CSVs named like: "Voice Metrics 5-18-26.csv"
 */

var FOLDER_IDS = {
  voiceMetrics:      '1nCpKUUGt_1Sb2yg-j7QcYDaDf_5idvTc',
  chatSLA:           '1dIZhVKT5QmjMVL3yl5cZZJQQ5qu3LxC5',
  voiceSLA:          '1cI46hILQQb-g-8TfHgZQ6T1dhwtQun10',
  emailProductivity: '1HQqdau5ytSMnGBI_D-N6iCLpVgC2oaOn'
};

// ===== LOB MATCHING =====
var SKIP_NAMES = ['summary','unassigned','b2b','secure payment'];

function matchLOB(name) {
  var lower = String(name).toLowerCase().trim();
  if (!lower) return null;
  for (var s = 0; s < SKIP_NAMES.length; s++) {
    if (lower.indexOf(SKIP_NAMES[s]) !== -1) return null;
  }
  var channel = null;
  if (lower.indexOf('voice') !== -1 || lower.indexOf('voic') !== -1) channel = 'calls';
  else if (lower.indexOf('chat') !== -1 || lower.indexOf('cha') !== -1) channel = 'chat';
  var lob = null;
  if (lower.indexOf('recovery') !== -1 || lower.indexOf('escalation') !== -1) lob = 'serviceRecovery';
  else if (lower.indexOf('sales') !== -1) lob = 'sales';
  else if (lower.indexOf('support') !== -1 || lower.indexOf('suppor') !== -1 ||
           lower.indexOf('spanish agents') !== -1 || lower.indexOf('spanish support') !== -1) lob = 'support';
  if (lob && channel) return { lob: lob, channel: channel };
  if (lob) return { lob: lob, channel: null };
  return null;
}

// ===== UTILITIES =====
function secsToDisplay(totalSecs) {
  var s = Math.round(totalSecs);
  if (isNaN(s) || s <= 0) return '0s';
  var m = Math.floor(s / 60);
  var sec = s % 60;
  if (m === 0) return sec + 's';
  return m + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
}
function formatCount(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function parseSLAPercent(val) {
  var str = String(val).trim();
  var match = str.match(/([\d.]+)%/);
  if (match) return parseFloat(match[1]);
  var num = parseFloat(str);
  if (!isNaN(num)) return num > 1 ? num : num * 100;
  return 0;
}
function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  return parseFloat(String(val).replace(/,/g, '').trim()) || 0;
}

// ===== FILE FINDING =====
function findMonthFolder(rootFolderId, date) {
  var monthNames = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
  var root = DriveApp.getFolderById(rootFolderId);
  var folders = root.getFoldersByName(monthNames[date.getMonth()] + ' ' + date.getFullYear());
  return folders.hasNext() ? folders.next() : null;
}

function findDatedFile(monthFolder, prefix, date) {
  if (!monthFolder) return null;
  var m = date.getMonth() + 1, d = date.getDate();
  var yy = String(date.getFullYear()).slice(-2);
  var mm = ('0' + m).slice(-2), dd = ('0' + d).slice(-2);
  var patterns = [
    prefix + ' ' + m + '-' + d + '-' + yy,
    prefix + ' ' + m + '-' + dd + '-' + yy,
    prefix + ' ' + mm + '-' + dd + '-' + yy
  ];
  for (var i = 0; i < patterns.length; i++) {
    var files = monthFolder.getFilesByName(patterns[i]);
    if (files.hasNext()) return files.next();
    files = monthFolder.getFilesByName(patterns[i] + '.csv');
    if (files.hasNext()) return files.next();
  }
  var allFiles = monthFolder.getFiles();
  while (allFiles.hasNext()) {
    var file = allFiles.next();
    var name = file.getName();
    if (name.indexOf(prefix) === 0 &&
        (name.indexOf(m + '-' + d + '-' + yy) !== -1 ||
         name.indexOf(mm + '-' + dd + '-' + yy) !== -1)) return file;
  }
  return null;
}

function readCSV(file) {
  if (!file) return [];
  return Utilities.parseCsv(file.getBlob().getDataAsString());
}

function findDataHeaderRow(rows, keywords) {
  for (var i = 0; i < Math.min(rows.length, 10); i++) {
    var rowStr = rows[i].join(' ').toLowerCase();
    var found = 0;
    for (var k = 0; k < keywords.length; k++) {
      if (rowStr.indexOf(keywords[k]) !== -1) found++;
    }
    if (found >= 2) return i;
  }
  return 0;
}

function findChatFile(monthFolder, date) {
  var file = findDatedFile(monthFolder, 'SLA Chats', date);
  if (!file) file = findDatedFile(monthFolder, 'Chat SLA', date);
  if (!file) file = findDatedFile(monthFolder, 'SLA Chat', date);
  if (!file) file = findDatedFile(monthFolder, 'Chats SLA', date);
  return file;
}

// ===== EMPTY ACCUMULATORS =====
function emptyVMAcc() { return { inbound:0, abandoned:0, ahtW:0, ahtN:0, queueW:0, queueN:0, missed:0, aatW:0, aatN:0, holdW:0, holdN:0 }; }
function emptyCSAcc() { return { inbound:0, slaSum:0, slaCount:0, frtW:0, frtN:0, ahtW:0, ahtN:0, queueW:0, queueN:0 }; }
function emptyVSAcc() { return { passed:0, total:0 }; }
function emptyEMAcc() { return { closed:0, assigned:0, replied:0, sent:0, agentMap:{} }; }

function initLobAccs(factory) {
  var acc = {};
  ['support','sales','serviceRecovery'].forEach(function(l) { acc[l] = factory(); });
  return acc;
}

// ===== PER-DATE EXTRACTION (additive to accumulators) =====

function extractVMForDate(date, acc) {
  var mf = findMonthFolder(FOLDER_IDS.voiceMetrics, date);
  var rows = readCSV(findDatedFile(mf, 'Voice Metrics', date));
  if (rows.length === 0) return;
  var hi = findDataHeaderRow(rows, ['inbound', 'abandoned', 'aht']);
  rows.slice(hi + 1).forEach(function(row) {
    if (row.length < 8) return;
    var m = matchLOB(row[0]);
    if (!m) return;
    if (m.channel && m.channel !== 'calls') return;
    var a = acc[m.lob], inb = parseNum(row[2]);
    a.inbound += inb;
    a.abandoned += parseNum(row[3]);
    var aht = parseNum(row[5]); if (aht > 0 && inb > 0) { a.ahtW += aht * inb; a.ahtN += inb; }
    var q = parseNum(row[6]); if (q > 0 && inb > 0) { a.queueW += q * inb; a.queueN += inb; }
    a.missed += parseNum(row[7]);
    var aat = parseNum(row[8]); if (aat > 0 && inb > 0) { a.aatW += aat * inb; a.aatN += inb; }
    var ht = parseNum(row[9]); if (ht > 0 && inb > 0) { a.holdW += ht * inb; a.holdN += inb; }
  });
}

function extractCSForDate(date, acc) {
  var mf = findMonthFolder(FOLDER_IDS.chatSLA, date);
  var rows = readCSV(findChatFile(mf, date));
  if (rows.length === 0) return;
  var hi = findDataHeaderRow(rows, ['sla', 'chat inbound', 'frt']);
  rows.slice(hi + 1).forEach(function(row) {
    if (row.length < 5) return;
    var m = matchLOB(row[0]);
    if (!m) return;
    if (m.channel && m.channel !== 'chat') return;
    var a = acc[m.lob], sla = parseSLAPercent(row[1]), inb = parseNum(row[2]);
    a.inbound += inb;
    if (sla > 0) { a.slaSum += sla; a.slaCount++; }
    var frt = parseNum(row[3]); if (frt > 0 && inb > 0) { a.frtW += frt * inb; a.frtN += inb; }
    var aht = parseNum(row[4]); if (aht > 0 && inb > 0) { a.ahtW += aht * inb; a.ahtN += inb; }
    var queue = parseNum(row.length > 6 ? row[6] : row[5]);
    if (queue > 0 && inb > 0) { a.queueW += queue * inb; a.queueN += inb; }
  });
}

function extractVSForDate(date, acc) {
  var mf = findMonthFolder(FOLDER_IDS.voiceSLA, date);
  var file = findDatedFile(mf, 'SLA Voice', date);
  if (!file) file = findDatedFile(mf, 'Voice SLA', date);
  var rows = readCSV(file);
  if (rows.length < 2) return;
  var header = rows[0], queueCol = -1, teamCol = -1;
  for (var i = 0; i < header.length; i++) {
    var h = header[i].toLowerCase();
    if (h.indexOf('queue time') !== -1) queueCol = i;
    if (h.indexOf('team') !== -1) teamCol = i;
  }
  if (queueCol === -1) queueCol = 2;
  if (teamCol === -1) teamCol = 3;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (row.length <= teamCol) continue;
    var m = matchLOB(row[teamCol]);
    if (!m) continue;
    if (m.channel && m.channel !== 'calls') continue;
    acc[m.lob].total++;
    if (parseNum(row[queueCol]) < 75) acc[m.lob].passed++;
  }
}

function extractEMForDate(date, acc) {
  var mf = findMonthFolder(FOLDER_IDS.emailProductivity, date);
  var rows = readCSV(findDatedFile(mf, 'Email Productivity', date));
  if (rows.length === 0) return;
  var hi = findDataHeaderRow(rows, ['action performed', 'closed', 'conversations']);
  rows.slice(hi + 1).forEach(function(row) {
    if (row.length < 5) return;
    var agent = String(row[0]).trim(), lower = agent.toLowerCase();
    if (!agent || lower === 'sleep expert' || lower === 'summary') return;
    var closed = parseNum(row[1]), assigned = parseNum(row[2]);
    var replied = parseNum(row[3]), sent = parseNum(row[4]);
    acc.closed += closed; acc.assigned += assigned;
    acc.replied += replied; acc.sent += sent;
    if (!acc.agentMap[agent]) acc.agentMap[agent] = 0;
    acc.agentMap[agent] += closed;
  });
}

// ===== ABSENTEEISM EXTRACTION =====
var ABSENTEEISM_SHEET_ID = '1x5P-0ZHbVvl7TJeEN2Q-iSyn9JfaKrwLCPF6leFixXQ';
var ABSENTEEISM_GID = 783994675;
var ABSENT_CODES = ['ML', 'A', 'HDSL', 'SL', 'LOA'];

var POD_TO_LOB = {
  'early returns': 'support',
  'ret mit': 'support',
  'ptc': 'support',
  'wgs ob': 'support',
  'pre delivery': 'support',
  'sales': 'sales',
  'service recovery': 'serviceRecovery',
  'escalation': 'serviceRecovery'
};

function extractAbsenteeism(dates) {
  var ss = SpreadsheetApp.openById(ABSENTEEISM_SHEET_ID);
  var sheets = ss.getSheets();
  var sheet = null;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === ABSENTEEISM_GID) { sheet = sheets[i]; break; }
  }
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  // Search top 5 rows in case headers are shifted down. 
  // Use getDisplayValues to avoid timezone shifting bugs where '5/19' GMT+8 becomes '5/18' PST!
  var headerData = sheet.getRange(1, 1, 5, lastCol).getDisplayValues();
  var allData = sheet.getRange(7, 1, lastRow - 6, lastCol).getValues();

  var dateCols = [];
  dates.forEach(function(date) {
    var tm = date.getMonth() + 1, td = date.getDate();
    var tmPad = ('0' + tm).slice(-2), tdPad = ('0' + td).slice(-2);
    
    var matchedColsForDate = [];
    for (var r = 0; r < 5; r++) {
      var row = headerData[r];
      for (var c = 0; c < row.length; c++) {
        var cell = row[c];
        if (cell === null || cell === undefined || cell === '') continue;
        
        if (cell instanceof Date) {
          if (cell.getMonth() + 1 === tm && cell.getDate() === td) { matchedColsForDate.push(c); }
        } else {
          var cs = String(cell).trim();
          if (cs === tm + '/' + td || cs === tmPad + '/' + tdPad || cs === tm + '/' + tdPad || cs.indexOf(tm + '/' + td + '/') === 0) { 
            matchedColsForDate.push(c);
          }
        }
      }
    }
    if (matchedColsForDate.length > 0) {
      // Pick the highest index (right-most column) to avoid hidden summary/old columns
      dateCols.push(matchedColsForDate[matchedColsForDate.length - 1]);
    }
  });

  if (dateCols.length === 0) return { error: "No matching date columns found in top 5 rows" };

  var acc = {};
  ['support','sales','serviceRecovery'].forEach(function(l) { acc[l] = { absent:0, active:0 }; });
  
  var statusCounts = {};
  var skippedAbs = [];

  dateCols.forEach(function(col) {
    allData.forEach(function(row) {
      var pod = String(row[5]).toLowerCase().trim(); // Column F = index 5
      var rawCell = String(row[col]).trim();
      if (!rawCell) return;
      
      // Extract the base status code before any spaces/hyphens/notes (e.g. "SL - Sick" -> "SL")
      var status = rawCell.split(/[\s\-]+/)[0].toUpperCase();
      if (status === 'N' || status === 'SUSP') return; 

      var lob = null;
      for (var k in POD_TO_LOB) {
        if (pod.indexOf(k) !== -1) { lob = POD_TO_LOB[k]; break; }
      }
      
      if (!lob) {
        if (ABSENT_CODES.indexOf(status) !== -1) {
          skippedAbs.push(pod + " (" + status + ")");
        }
        return;
      }

      acc[lob].active++;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (ABSENT_CODES.indexOf(status) !== -1) acc[lob].absent++;
    });
  });

  var result = {};
  var totalAbsent = 0, totalActive = 0;
  ['support','sales','serviceRecovery'].forEach(function(l) {
    var a = acc[l];
    totalAbsent += a.absent;
    totalActive += a.active;
    result[l] = {
      rate: a.active > 0 ? Math.round((a.absent / a.active) * 100) + '%' : '0%',
      absent: a.absent,
      active: a.active
    };
  });
  result.global = {
    rate: totalActive > 0 ? Math.round((totalAbsent / totalActive) * 100) + '%' : '0%',
    absent: totalAbsent,
    active: totalActive
  };
  result.debugInfo = { dateColsIdxs: dateCols, activeFound: totalActive, statuses: statusCounts, skippedAbs: skippedAbs };
  return result;
}

// ===== MAIN ENTRY =====
function fetchSLAData(startDateStr, endDateStr) {
  if (!endDateStr) endDateStr = startDateStr;
  var sd = new Date(startDateStr + 'T12:00:00');
  var ed = new Date(endDateStr + 'T12:00:00');

  // Build date array
  var dates = [];
  var d = new Date(sd);
  while (d <= ed) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }

  // Initialize accumulators
  var vmAcc = initLobAccs(emptyVMAcc);
  var csAcc = initLobAccs(emptyCSAcc);
  var vsAcc = initLobAccs(emptyVSAcc);
  var emAcc = emptyEMAcc();
  var errors = [];

  // Process each date
  dates.forEach(function(date) {
    try { extractVMForDate(date, vmAcc); } catch(e) { errors.push('VM ' + date.getDate() + ': ' + e.message); }
    try { extractCSForDate(date, csAcc); } catch(e) { errors.push('CS ' + date.getDate() + ': ' + e.message); }
    try { extractVSForDate(date, vsAcc); } catch(e) { errors.push('VS ' + date.getDate() + ': ' + e.message); }
    try { extractEMForDate(date, emAcc); } catch(e) { errors.push('EM ' + date.getDate() + ': ' + e.message); }
  });

  // Absenteeism from ECE Schedule sheet
  var absenteeism = null;
  try { absenteeism = extractAbsenteeism(dates); } catch(e) { errors.push('Absent: ' + e.message); }

  // Convert accumulators to result
  var result = { support: { chat:{}, calls:{} }, sales: { chat:{}, calls:{} }, serviceRecovery: { chat:{}, calls:{} } };

  ['support','sales','serviceRecovery'].forEach(function(lob) {
    var abRate = absenteeism && absenteeism[lob] ? absenteeism[lob].rate : '—';
    var abCount = absenteeism && absenteeism[lob] ? absenteeism[lob].absent : 0;

    // Voice
    var v = vmAcc[lob], vs = vsAcc[lob];
    var vsPctRaw = vs.total > 0 ? (vs.passed / vs.total) * 100 : 100;
    var vsPct = parseFloat(vsPctRaw.toFixed(2));
    result[lob].calls = {
      inbound: formatCount(v.inbound), abandoned: formatCount(v.abandoned), missed: formatCount(v.missed),
      sla: vsPct.toFixed(2) + '%', status: (vsPct >= 80 && vsPct <= 87) ? 'good' : 'alert',
      aht: v.ahtN > 0 ? secsToDisplay(v.ahtW / v.ahtN) : '0s',
      inQueue: v.queueN > 0 ? secsToDisplay(v.queueW / v.queueN) : '0s',
      aat: v.aatN > 0 ? secsToDisplay(v.aatW / v.aatN) : '0s',
      holdTime: v.holdN > 0 ? secsToDisplay(v.holdW / v.holdN) : '0s',
      absenteeism: abRate, absentCount: abCount
    };
    // Chat
    var c = csAcc[lob];
    var csPctRaw = c.slaCount > 0 ? c.slaSum / c.slaCount : 100;
    var csPct = parseFloat(csPctRaw.toFixed(2));
    result[lob].chat = {
      inbound: formatCount(c.inbound), sla: csPct.toFixed(2) + '%',
      status: (csPct >= 80 && csPct <= 87) ? 'good' : 'alert',
      frt: c.frtN > 0 ? secsToDisplay(c.frtW / c.frtN) : '0s',
      aht: c.ahtN > 0 ? secsToDisplay(c.ahtW / c.ahtN) : '0s',
      inQueue: c.queueN > 0 ? secsToDisplay(c.queueW / c.queueN) : '0s',
      absenteeism: abRate, absentCount: abCount
    };
  });

  // Email
  var topAgents = Object.keys(emAcc.agentMap).map(function(n) {
    return { name: n, score: emAcc.agentMap[n] };
  }).sort(function(a, b) { return b.score - a.score; }).slice(0, 5);

  var label = dates.length === 1
    ? Utilities.formatDate(sd, 'America/New_York', 'yyyy-MM-dd')
    : Utilities.formatDate(sd, 'America/New_York', 'MM/dd') + ' – ' + Utilities.formatDate(ed, 'America/New_York', 'MM/dd/yyyy');

  // Global absenteeism
  var globalAb = absenteeism && absenteeism.global ? absenteeism.global : { rate: '—', absent: 0, active: 0 };

  return {
    slaData: result,
    emailData: { closed: emAcc.closed, assigned: emAcc.assigned, replied: emAcc.replied, sent: emAcc.sent, topAgents: topAgents },
    absenteeismData: absenteeism,
    globalAbsenteeism: globalAb,
    errors: errors,
    date: label,
    daysProcessed: dates.length
  };
}

// ===== WEEKLY BREAKDOWN =====
function fetchWeeklyBreakdown() {
  var today = new Date();
  var dow = today.getDay(); // 0=Sun
  var weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow);
  
  var days = [];
  for (var i = 0; i <= dow && i < 7; i++) {
    days.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  }
  
  var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var result = [];
  var errors = [];
  
  days.forEach(function(date) {
    var dateStr = Utilities.formatDate(date, 'America/New_York', 'MM/dd');
    var dayLabel = dayNames[date.getDay()] + ' ' + dateStr;
    
    // Per-day accumulators
    var vmAcc = initLobAccs(emptyVMAcc);
    var csAcc = initLobAccs(emptyCSAcc);
    var vsAcc = initLobAccs(emptyVSAcc);
    var emAcc = emptyEMAcc();
    
    try { extractVMForDate(date, vmAcc); } catch(e) { errors.push('VM ' + dateStr + ': ' + e.message); }
    try { extractCSForDate(date, csAcc); } catch(e) { errors.push('CS ' + dateStr + ': ' + e.message); }
    try { extractVSForDate(date, vsAcc); } catch(e) { errors.push('VS ' + dateStr + ': ' + e.message); }
    try { extractEMForDate(date, emAcc); } catch(e) { errors.push('EM ' + dateStr + ': ' + e.message); }
    
    var absenteeism = null;
    try { absenteeism = extractAbsenteeism([date]); } catch(e) { errors.push('AB ' + dateStr + ': ' + e.message); }
    
    var dayData = { label: dayLabel, isToday: (date.toDateString() === today.toDateString()), hasData: false };
    
    var totalVoiceInbound = 0, totalChatInbound = 0, totalEmail = 0;
    
    ['support','sales','serviceRecovery'].forEach(function(lob) {
      var abRate = absenteeism && absenteeism[lob] ? absenteeism[lob].rate : '—';
      var abCount = absenteeism && absenteeism[lob] ? absenteeism[lob].absent : 0;
      
      var v = vmAcc[lob], vs = vsAcc[lob];
      var vsPct = vs.total > 0 ? parseFloat(((vs.passed / vs.total) * 100).toFixed(2)) : -1;
      var c = csAcc[lob];
      var csPct = c.slaCount > 0 ? parseFloat((c.slaSum / c.slaCount).toFixed(2)) : -1;
      
      totalVoiceInbound += v.inbound;
      totalChatInbound += c.inbound;
      
      dayData[lob] = {
        voiceInbound: v.inbound,
        voiceAbandoned: v.abandoned,
        voiceSLA: vsPct,
        voiceAHT: v.ahtN > 0 ? Math.round(v.ahtW / v.ahtN) : 0,
        chatInbound: c.inbound,
        chatSLA: csPct >= 0 ? csPct : -1,
        chatFRT: c.frtN > 0 ? Math.round(c.frtW / c.frtN) : 0,
        chatAHT: c.ahtN > 0 ? Math.round(c.ahtW / c.ahtN) : 0,
        absentRate: abRate,
        absentCount: abCount
      };
    });
    
    totalEmail = emAcc.closed + emAcc.assigned + emAcc.replied + emAcc.sent;
    dayData.hasData = (totalVoiceInbound > 0 || totalChatInbound > 0 || totalEmail > 0);
    
    dayData.email = {
      closed: emAcc.closed,
      assigned: emAcc.assigned,
      replied: emAcc.replied,
      sent: emAcc.sent
    };
    
    result.push(dayData);
  });
  
  return { weeklyData: result, errors: errors };
}
