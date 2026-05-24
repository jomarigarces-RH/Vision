/**
 * IntercomService.gs — Live Data Integration via Intercom API
 * Handles Voice, Chat, and Email metrics separately.
 */

var INTERCOM_BASE_URL = 'https://api.intercom.io';

// ===== TEAM MAPPINGS (Based on User Provided IDs) =====
var TEAM_IDS = {
  SALES: {
    voice: ['10117691', '10126750'], 
    chat:  ['9540784']               
  },
  SUPPORT: {
    voice: ['10117732', '10117711', '10126764'], 
    chat:  ['9903546', '9903543']               
  },
  RECOVERY: {
    voice: ['10117736'], 
    chat:  ['9540789']   
  }
};

/**
 * Fetches comprehensive metrics for a specific date.
 */
function fetchIntercomMetricsForDate(dateStr) {
  var token = getIntercomToken();
  if (!token) throw new Error("No Intercom Token provided.");

  var startTs = Math.floor(new Date(dateStr + 'T00:00:00').getTime() / 1000);
  var endTs = startTs + 86399;

  // Final data structure
  var data = {
    support: { chat: initMetric(), calls: initMetric() },
    sales: { chat: initMetric(), calls: initMetric() },
    serviceRecovery: { chat: initMetric(), calls: initMetric() },
    email: { closed: 0, assigned: 0, replied: 0, sent: 0, topAgents: [] }
  };

  // 1. Get all conversations for mapping Teams & Channels
  var allTeams = [];
  for (var k in TEAM_IDS) {
    allTeams = allTeams.concat(TEAM_IDS[k].voice, TEAM_IDS[k].chat);
  }

  // Intercom Filter query
  var teamFilters = allTeams.map(function(id) {
    return { "field": "team_assignee_id", "operator": "=", "value": parseInt(id) };
  });

  var query = {
    "query": {
      "operator": "AND",
      "value": [
        { "field": "created_at", "operator": ">", "value": startTs },
        { "field": "created_at", "operator": "<", "value": endTs },
        { "operator": "OR", "value": teamFilters }
      ]
    }
  };

  var conversations = callIntercomSearch(query, token);
  var agentStats = {}; // To track top agents for email

  conversations.forEach(function(conv) {
    var teamId = String(conv.team_assignee_id || (conv.assignee && conv.assignee.id) || "");
    var mapping = findTeamMapping(teamId);
    if (!mapping) return;

    var channel = (conv.source.type === 'phone' || conv.source.type === 'call') ? 'calls' : 'chat';
    var target = data[mapping.lob][channel];

    // INBOUND vs OUTBOUND
    // Outbound usually has an admin as a creator OR was initiated by an admin
    if (conv.source.author && conv.source.author.type === 'admin') {
      target.outbound++;
    } else {
      target.inbound++;
    }

    if (conv.statistics) {
      var s = conv.statistics;
      var frt = s.time_to_first_response;
      var aht = s.time_to_last_close;

      if (frt !== null && frt !== undefined) {
        target.frtSum += frt;
        target.frtCount++;
        // SLA: Chat < 90s, Voice < 75s (approx)
        var goal = (channel === 'calls') ? 75 : 90;
        if (frt <= goal) target.slaPassed++;
        target.slaTotal++;
      } else if (conv.state === 'closed') {
        // Closed without response = Abandoned
        target.abandoned++;
      }
      
      if (aht !== null && aht !== undefined) {
        target.ahtSum += aht;
        target.ahtCount++;
      }

      // VOICE SPECIFIC ENHANCEMENTS
      if (channel === 'calls') {
        if (s.time_to_admin_reply !== undefined) { // ASA / Queue Time equivalent
           target.inQueueSum += s.time_to_admin_reply;
           target.inQueueCount++;
        }
        // Missed calls: state is closed, but no replies or talk time
        if (conv.state === 'closed' && !s.time_to_first_response) {
           target.missed++;
        }
      }
    }

    // EMAIL SPECIFIC PRODUCTIVITY
    if (conv.source.type === 'email' || conv.source.delivery_method === 'email') {
      data.email.assigned++;
      if (conv.state === 'closed') data.email.closed++;
      if (conv.statistics && conv.statistics.time_to_first_response) data.email.replied++;
      
      // Track top agents
      if (conv.admin_assignee_id) {
        var aid = conv.admin_assignee_id;
        if (!agentStats[aid]) agentStats[aid] = { id: aid, count: 0 };
        agentStats[aid].count++;
      }
    }
  });

  // 2. Finalize metrics (averages & percentages)
  ['support','sales','serviceRecovery'].forEach(function(l) {
    ['chat','calls'].forEach(function(c) {
      data[l][c] = finalizeMetric(data[l][c]);
    });
  });

  // Convert agentStats to array for Email Productivity
  var agentArr = [];
  for (var id in agentStats) agentArr.push(agentStats[id]);
  agentArr.sort(function(a,b){ return b.count - a.count; });
  data.email.topAgents = agentArr.slice(0, 5).map(function(a) { 
    return { name: "Agent ID " + a.id, count: a.count }; 
  });
  data.email.sent = data.email.replied; // Approximated

  return data;
}

function initMetric() {
  return { 
    inbound: 0, 
    outbound: 0,
    abandoned: 0, 
    missed: 0,
    slaTotal: 0, 
    slaPassed: 0, 
    frtSum: 0, 
    frtCount: 0, 
    ahtSum: 0, 
    ahtCount: 0,
    holdTimeSum: 0,
    holdTimeCount: 0,
    talkTimeSum: 0,
    talkTimeCount: 0,
    inQueueSum: 0,
    inQueueCount: 0
  };
}

function finalizeMetric(m) {
  var slaVal = m.slaTotal > 0 ? (m.slaPassed / m.slaTotal) * 100 : 100;
  return {
    inbound: m.inbound,
    outbound: m.outbound,
    abandoned: m.abandoned,
    missed: m.missed,
    sla: slaVal.toFixed(2) + '%',
    slaPassed: m.slaPassed,
    slaTotal: m.slaTotal,
    frt: m.frtCount > 0 ? formatSec(m.frtSum / m.frtCount) : "0s",
    aht: m.ahtCount > 0 ? formatSec(m.ahtSum / m.ahtCount) : "0s",
    holdTime: m.holdTimeCount > 0 ? formatSec(m.holdTimeSum / m.holdTimeCount) : "0s",
    talkTime: m.talkTimeCount > 0 ? formatSec(m.talkTimeSum / m.talkTimeCount) : "0s",
    inQueue: m.inQueueCount > 0 ? formatSec(m.inQueueSum / m.inQueueCount) : "0s",
    status: slaVal >= 80 ? (slaVal <= 87 ? 'warning' : 'passed') : 'failed'
  };
}

function formatSec(s) {
  s = Math.round(s);
  if (s < 60) return s + "s";
  var m = Math.floor(s / 60);
  var rs = s % 60;
  return m + "m " + rs + "s";
}

function findTeamMapping(teamId) {
  if (!teamId) return null;
  teamId = String(teamId);
  for (var lobKey in TEAM_IDS) {
    var lob = lobKey === 'RECOVERY' ? 'serviceRecovery' : lobKey.toLowerCase();
    if (TEAM_IDS[lobKey].voice.indexOf(teamId) !== -1) return { lob: lob, type: 'voice' };
    if (TEAM_IDS[lobKey].chat.indexOf(teamId) !== -1) return { lob: lob, type: 'chat' };
  }
  return null;
}

// ===== WEBHOOK HANDLING (Option 3) =====
function processIntercomWebhook(payload) {
  var topic = payload.topic;
  Logger.log("Processing topic: " + topic);
  
  if (!payload.data || !payload.data.item) {
    Logger.log("Webhook payload has no data.item - likely a ping or test request.");
    return;
  }
  
  var data = payload.data.item;
  
  if (topic === 'conversation.admin.replied' || topic === 'conversation.closed') {
    // Logic to update live cache sheet
    logEventToLiveSheet(data, topic);
  }
}

function logEventToLiveSheet(conv, topic) {
  var ss = getDbSpreadsheet();
  var sheet = ss.getSheetByName('Live_Metrics_Cache') || ss.insertSheet('Live_Metrics_Cache');
  
  // Basic logging for now — will expand as we build the SheetManager
  var teamId = String(conv.team_assignee_id || (conv.assignee && conv.assignee.id) || "");
  var mapping = findTeamMapping(teamId);
  if (!mapping) return;

  var timestamp = new Date();
  var channel = (conv.source.type === 'phone' || conv.source.type === 'call') ? 'calls' : 'chat';
  
  sheet.appendRow([
    timestamp, 
    conv.id, 
    mapping.lob, 
    channel, 
    topic, 
    conv.state,
    conv.statistics ? JSON.stringify(conv.statistics) : ""
  ]);
}

/**
 * Handles pagination for Intercom Search.
 */
function callIntercomSearch(query, token) {
  var allItems = [];
  var cursor = null;
  var maxPages = 8; // Increased for high volume

  for (var p = 0; p < maxPages; p++) {
    var payload = JSON.parse(JSON.stringify(query));
    if (cursor) payload.pagination = { "starting_after": cursor };

    var options = {
      method: "POST",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + token,
        "Intercom-Version": "2.10",
        "Accept": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(INTERCOM_BASE_URL + '/conversations/search', options);
    var code = response.getResponseCode();
    var resText = response.getContentText();
    var resJson = JSON.parse(resText);

    if (code !== 200) {
      throw new Error("Intercom API: " + (resJson.errors ? resJson.errors[0].message : resText));
    }

    if (resJson.conversations) {
      allItems = allItems.concat(resJson.conversations);
    }

    if (resJson.pages && resJson.pages.next && resJson.pages.next.starting_after) {
      cursor = resJson.pages.next.starting_after;
    } else {
      break;
    }
  }
  return allItems;
}
