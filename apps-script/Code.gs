var BUG_BOOK_HEADERS = [
  "entry_date",
  "score",
  "creative_hours",
  "social_hours",
  "day_description",
  "score_reason",
  "submitted_at_local",
  "client_timezone",
  "received_at_script",
  "api_version",
  "user_agent",
  "source",
];

var ALLOWED_SCORES = [2, 1, 0, -1, -2];

function doGet() {
  return jsonResponse_({
    ok: true,
    message: "Bug Book Apps Script endpoint is running.",
  });
}

function doPost(e) {
  try {
    var settings = getSettings_();
    var payload = parsePayload_(e);

    validateApiKey_(payload.apiKey, settings.expectedApiKey);

    var entry = validateEntry_(payload);
    var sheet = getSheet_(settings.spreadsheetId, settings.sheetName);
    ensureHeaders_(sheet);

    sheet.appendRow(buildRow_(entry));

    return jsonResponse_({
      ok: true,
      message: "Saved entry",
      entryDate: entry.entryDate,
    });
  } catch (error) {
    logError_(error);
    return jsonResponse_({
      ok: false,
      message: error.message || "Unexpected server error.",
    });
  }
}

function getSettings_() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  var spreadsheetId = properties.SPREADSHEET_ID || "";
  var sheetName = properties.SHEET_NAME || "entries";
  var expectedApiKey = properties.EXPECTED_API_KEY || "";

  if (!spreadsheetId) {
    throw new Error("Missing script property SPREADSHEET_ID.");
  }

  if (!expectedApiKey) {
    throw new Error("Missing script property EXPECTED_API_KEY.");
  }

  return {
    spreadsheetId: spreadsheetId,
    sheetName: sheetName,
    expectedApiKey: expectedApiKey,
  };
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Malformed JSON payload.");
  }
}

function validateApiKey_(apiKey, expectedApiKey) {
  if (!apiKey) {
    throw new Error("Missing API key.");
  }

  if (apiKey !== expectedApiKey) {
    throw new Error("Invalid API key.");
  }
}

function validateEntry_(payload) {
  var entryDate = stringOrEmpty_(payload.entryDate);
  var score = Number(payload.score);
  var creativeHours = Number(payload.creativeHours);
  var socialHours = Number(payload.socialHours);
  var dayDescription = stringOrEmpty_(payload.dayDescription).trim();
  var scoreReason = stringOrEmpty_(payload.scoreReason).trim();
  var submittedAtLocal = stringOrEmpty_(payload.submittedAtLocal);
  var clientTimezone = stringOrEmpty_(payload.clientTimezone) || "UTC";
  var apiVersion = stringOrEmpty_(payload.apiVersion) || "v1";
  var userAgent = stringOrEmpty_(payload.userAgent);
  var source = stringOrEmpty_(payload.source) || "pwa";

  if (!isIsoDate_(entryDate)) {
    throw new Error("Invalid entry date.");
  }

  if (ALLOWED_SCORES.indexOf(score) === -1) {
    throw new Error("Invalid score.");
  }

  if (!isNonNegativeNumber_(creativeHours)) {
    throw new Error("Creative hours must be a non-negative number.");
  }

  if (!isNonNegativeNumber_(socialHours)) {
    throw new Error("Social hours must be a non-negative number.");
  }

  if (!dayDescription) {
    throw new Error("Day description is required.");
  }

  if (!scoreReason) {
    throw new Error("Score reason is required.");
  }

  if (!isIsoTimestamp_(submittedAtLocal)) {
    throw new Error("Invalid submittedAtLocal timestamp.");
  }

  return {
    entryDate: entryDate,
    score: score,
    creativeHours: creativeHours,
    socialHours: socialHours,
    dayDescription: dayDescription,
    scoreReason: scoreReason,
    submittedAtLocal: submittedAtLocal,
    clientTimezone: clientTimezone,
    apiVersion: apiVersion,
    userAgent: userAgent,
    source: source,
  };
}

function getSheet_(spreadsheetId, sheetName) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, BUG_BOOK_HEADERS.length);
  var currentHeaders = headerRange.getValues()[0];
  var isHeaderRowEmpty = currentHeaders.every(function (value) {
    return value === "";
  });

  if (isHeaderRowEmpty) {
    headerRange.setValues([BUG_BOOK_HEADERS]);
    return;
  }

  var normalizedHeaders = currentHeaders.map(function (value) {
    return String(value).trim();
  });

  if (normalizedHeaders.join("|") !== BUG_BOOK_HEADERS.join("|")) {
    throw new Error(
      "Sheet headers do not match the expected Bug Book schema."
    );
  }
}

function buildRow_(entry) {
  return [
    entry.entryDate,
    entry.score,
    entry.creativeHours,
    entry.socialHours,
    entry.dayDescription,
    entry.scoreReason,
    entry.submittedAtLocal,
    entry.clientTimezone,
    new Date(),
    entry.apiVersion,
    entry.userAgent,
    entry.source,
  ];
}

function isIsoDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  var parts = value.split("-");
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isIsoTimestamp_(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  return !isNaN(Date.parse(value));
}

function isNonNegativeNumber_(value) {
  return typeof value === "number" && isFinite(value) && value >= 0;
}

function stringOrEmpty_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function logError_(error) {
  console.error(error);
  Logger.log(error && error.stack ? error.stack : error);
}
