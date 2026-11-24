/**
 * Holmgard and beyond — cloud skippers' board (Google Apps Script)
 * Deploy once on your own Google account:
 *   1. script.google.com → New project → paste this file over Code.gs → Save.
 *   2. Deploy → New deployment → type: Web app.
 *      Execute as: Me.  Who has access: Anyone (the app has no user data of its own).
 *   3. Copy the /exec URL and paste it into the game's "Cloud skippers' board" panel.
 * Data lives in the script's own PropertiesService (no spreadsheet needed).
 * Board shape: rows of { n: name, s: score, d: day, m: dirhams, t: tier, g: destination }.
 */

var KEY = 'HMG_BOARD';
var MAX_ROWS = 10;

function readBoard_() {
  var raw = PropertiesService.getScriptProperties().getProperty(KEY);
  var rows = [];
  try { rows = raw ? JSON.parse(raw) : []; } catch (e) { rows = []; }
  if (!Array.isArray(rows)) rows = [];
  return rows;
}
function writeBoard_(rows) {
  rows.sort(function (a, b) { return (b.s | 0) - (a.s | 0); });
  PropertiesService.getScriptProperties().setProperty(KEY, JSON.stringify(rows.slice(0, 50)));
}
function sanitizeRow_(e) {
  if (!e || typeof e !== 'object') return null;
  return {
    n: String(e.n || 'The skipper').slice(0, 18).replace(/[<>&"]/g, ''),
    s: Math.max(-9999, Math.min(999999, e.s | 0)),
    d: Math.max(0, Math.min(999, e.d | 0)),
    m: Math.max(0, Math.min(99999, e.m | 0)),
    t: String(e.t || '').slice(0, 12).replace(/[<>&"]/g, ''),
    g: (e.g === 'Holmgard') ? 'Holmgard' : 'Aldeigjuborg'
  };
}

function doGet() {
  var rows = readBoard_().slice(0, MAX_ROWS);
  return ContentService.createTextOutput(JSON.stringify({ rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    var incoming = (body && Array.isArray(body.rows)) ? body.rows : [];
    var board = readBoard_();
    var seen = {};
    board.forEach(function (r) { seen[r.n + '|' + r.s] = true; });
    incoming.forEach(function (r) {
      var row = sanitizeRow_(r);
      if (row && !seen[row.n + '|' + row.s]) { board.push(row); seen[row.n + '|' + row.s] = true; }
    });
    writeBoard_(board);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: board.slice(0, MAX_ROWS) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
