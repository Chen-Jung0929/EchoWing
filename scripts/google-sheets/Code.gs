/**
 * EchoWing — Google Sheets endpoint (schema v3, 8 columns)
 *
 * Row 1 headers:
 * observed_at | location | latitude | longitude | predicted_species |
 * observer_name | observer_comment | model
 *
 * POST body.action: omit or 'append' → write row
 * POST body.action: 'query_nearby' → search by GPS radius
 */

var SHEET_NAME = 'Records';
var SCHEMA_VERSION = 'v3-8col';
var NUM_COLS = 8;

var COLUMN_KEYS = [
  'observed_at',
  'location',
  'latitude',
  'longitude',
  'predicted_species',
  'observer_name',
  'observer_comment',
  'model',
];

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function pick(data, keys) {
  for (var i = 0; i < keys.length; i++) {
    var val = data[keys[i]];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      return String(val);
    }
  }
  return '';
}

function buildRowV3(data) {
  return [
    pick(data, ['observed_at']),
    pick(data, ['location']),
    pick(data, ['latitude']),
    pick(data, ['longitude']),
    pick(data, ['predicted_species', 'top_species_summary']),
    pick(data, ['observer_name']),
    pick(data, ['observer_comment', 'overall_conclusion']),
    pick(data, ['model']),
  ];
}

function parseCoord(val) {
  if (val === null || val === undefined || val === '') return NaN;
  var n = parseFloat(String(val).trim());
  return isFinite(n) ? n : NaN;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRecordsSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  }
  return sheet;
}

function findNextRecordRow(sheet, numCols) {
  var maxRow = sheet.getLastRow();
  var lastWithContent = 1;

  if (maxRow >= 2) {
    var numRows = maxRow - 1;
    var values = sheet.getRange(2, 1, numRows, numCols).getValues();
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      for (var j = 0; j < numCols; j++) {
        if (String(row[j]).trim() !== '') {
          lastWithContent = i + 2;
          break;
        }
      }
    }
  }

  return lastWithContent + 1;
}

function rowHasContent(row) {
  for (var i = 0; i < row.length; i++) {
    if (String(row[i]).trim() !== '') return true;
  }
  return false;
}

function writeRecordRow(sheet, row) {
  if (!rowHasContent(row)) {
    return { ok: false, message: 'Empty record' };
  }

  var numCols = row.length;
  var targetRow = findNextRecordRow(sheet, numCols);
  sheet.getRange(targetRow, 1, 1, numCols).setValues([row]);
  return { ok: true, row: targetRow };
}

function readAllRecords(sheet) {
  var maxRow = sheet.getLastRow();
  if (maxRow < 2) return [];

  var numRows = maxRow - 1;
  var values = sheet.getRange(2, 1, numRows, NUM_COLS).getValues();
  var records = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var c = 0; c < COLUMN_KEYS.length; c++) {
      item[COLUMN_KEYS[c]] = row[c] != null ? String(row[c]) : '';
    }
    records.push(item);
  }

  return records;
}

function handleQueryNearby(data) {
  var lat = parseCoord(data.latitude);
  var lng = parseCoord(data.longitude);
  if (!isFinite(lat) || !isFinite(lng)) {
    return jsonResponse({ ok: false, message: 'Invalid latitude or longitude' });
  }

  var radiusKm = parseCoord(data.radius_km);
  if (!isFinite(radiusKm) || radiusKm <= 0) radiusKm = 5;

  var limit = parseInt(data.limit, 10);
  if (!isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;

  var sheet = getRecordsSheet();
  var all = readAllRecords(sheet);
  var matches = [];

  for (var i = 0; i < all.length; i++) {
    var rec = all[i];
    var rLat = parseCoord(rec.latitude);
    var rLng = parseCoord(rec.longitude);
    if (!isFinite(rLat) || !isFinite(rLng)) continue;

    var dist = haversineKm(lat, lng, rLat, rLng);
    if (dist <= radiusKm) {
      var copy = {};
      for (var k = 0; k < COLUMN_KEYS.length; k++) {
        copy[COLUMN_KEYS[k]] = rec[COLUMN_KEYS[k]];
      }
      copy.distance_km = Math.round(dist * 100) / 100;
      matches.push(copy);
    }
  }

  matches.sort(function (a, b) {
    return a.distance_km - b.distance_km;
  });

  if (matches.length > limit) {
    matches = matches.slice(0, limit);
  }

  return jsonResponse({
    ok: true,
    schema: SCHEMA_VERSION,
    radius_km: radiusKm,
    count: matches.length,
    records: matches,
  });
}

function handleAppend(data) {
  var sheet = getRecordsSheet();
  var row = buildRowV3(data);

  if (row.length !== NUM_COLS) {
    return jsonResponse({ ok: false, message: 'Internal schema error' });
  }

  var written = writeRecordRow(sheet, row);
  if (!written.ok) {
    return jsonResponse({ ok: false, message: written.message });
  }

  return jsonResponse({
    ok: true,
    schema: SCHEMA_VERSION,
    columns: row.length,
    row: written.row,
  });
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: 'EchoWing survey endpoint',
    schema: SCHEMA_VERSION,
    columns: COLUMN_KEYS,
  });
}

function doPost(e) {
  try {
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('SHEET_SECRET');
    if (!expectedSecret) {
      return jsonResponse({ ok: false, message: 'SHEET_SECRET not configured' });
    }

    var raw = e && e.postData ? e.postData.contents : '';
    if (!raw) {
      return jsonResponse({ ok: false, message: 'Empty body' });
    }

    var data = JSON.parse(raw);
    if (!data.secret || data.secret !== expectedSecret) {
      return jsonResponse({ ok: false, message: 'Unauthorized' });
    }

    var action = data.action ? String(data.action) : 'append';
    if (action === 'query_nearby') {
      return handleQueryNearby(data);
    }

    return handleAppend(data);
  } catch (err) {
    return jsonResponse({ ok: false, message: String(err.message || err) });
  }
}
