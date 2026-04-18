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

function doGet(e) {
  return jsonResponse_(runDiagnostics_(e));
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

function runDiagnostics_(e) {
  var parameters = (e && e.parameter) || {};
  var providedApiKey = stringOrEmpty_(parameters.apiKey);
  var diagnostics = {
    endpoint: createCheck_(true, "Apps Script endpoint responded."),
    scriptProperties: createCheck_(true, "Required script properties are configured."),
    apiKey: providedApiKey
      ? createCheck_(true, "API key was accepted.")
      : createCheck_(true, "No API key was provided for verification.", true),
    spreadsheet: createCheck_(true, "Spreadsheet opened successfully."),
    sheet: createCheck_(true, 'Sheet tab "bug_book" is ready.'),
    headers: createCheck_(true, "Sheet headers are ready for Bug Book entries."),
  };
  var properties = PropertiesService.getScriptProperties().getProperties();
  var spreadsheetId = properties.SPREADSHEET_ID || "";
  var expectedApiKey = properties.EXPECTED_API_KEY || "";
  var sheetName = properties.SHEET_NAME || "bug_book";
  var spreadsheet = null;
  var sheet = null;

  diagnostics.sheet.message = 'Sheet tab "' + sheetName + '" is ready.';

  if (!spreadsheetId && !expectedApiKey) {
    diagnostics.scriptProperties = createCheck_(
      false,
      "Missing script properties SPREADSHEET_ID and EXPECTED_API_KEY."
    );
  } else if (!spreadsheetId) {
    diagnostics.scriptProperties = createCheck_(
      false,
      "Missing script property SPREADSHEET_ID."
    );
  } else if (!expectedApiKey) {
    diagnostics.scriptProperties = createCheck_(
      false,
      "Missing script property EXPECTED_API_KEY."
    );
  }

  if (!diagnostics.scriptProperties.ok) {
    diagnostics.spreadsheet = createCheck_(
      false,
      "Spreadsheet readiness could not be checked until script properties are configured.",
      true
    );
    diagnostics.sheet = createCheck_(
      false,
      'Sheet readiness could not be checked until script properties are configured.',
      true
    );
    diagnostics.headers = createCheck_(
      false,
      "Sheet headers could not be checked until script properties are configured.",
      true
    );

    if (providedApiKey) {
      diagnostics.apiKey = createCheck_(
        false,
        "API key could not be verified until EXPECTED_API_KEY is configured.",
        true
      );
    }

    return buildDiagnosticsResponse_(diagnostics, sheetName);
  }

  if (providedApiKey && providedApiKey !== expectedApiKey) {
    diagnostics.apiKey = createCheck_(false, "API key was rejected.");
  }

  try {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    diagnostics.spreadsheet = createCheck_(
      false,
      "Spreadsheet could not be opened. Check SPREADSHEET_ID and sharing permissions."
    );
    diagnostics.sheet = createCheck_(
      false,
      "Sheet readiness could not be checked until the spreadsheet opens.",
      true
    );
    diagnostics.headers = createCheck_(
      false,
      "Sheet headers could not be checked until the spreadsheet opens.",
      true
    );

    return buildDiagnosticsResponse_(diagnostics, sheetName);
  }

  try {
    sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
      diagnostics.sheet = createCheck_(
        true,
        'Found existing sheet tab "' + sheetName + '".'
      );
    } else {
      sheet = spreadsheet.insertSheet(sheetName);
      diagnostics.sheet = createCheck_(
        true,
        'Created missing sheet tab "' + sheetName + '".'
      );
    }
  } catch (error) {
    diagnostics.sheet = createCheck_(
      false,
      'Sheet tab "' + sheetName + '" could not be opened or created.'
    );
    diagnostics.headers = createCheck_(
      false,
      "Sheet headers could not be checked until the target sheet is available.",
      true
    );

    return buildDiagnosticsResponse_(diagnostics, sheetName);
  }

  diagnostics.headers = getHeaderDiagnostics_(sheet);

  return buildDiagnosticsResponse_(diagnostics, sheetName);
}

function getSettings_() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  var spreadsheetId = properties.SPREADSHEET_ID || "";
  var sheetName = properties.SHEET_NAME || "bug_book";
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
  var headerState = inspectHeaderState_(sheet);

  if (headerState.isEmpty) {
    sheet.getRange(1, 1, 1, BUG_BOOK_HEADERS.length).setValues([BUG_BOOK_HEADERS]);
    return;
  }

  if (!headerState.ok) {
    throw new Error(
      "Sheet headers do not match the expected Bug Book schema."
    );
  }
}

function inspectHeaderState_(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, BUG_BOOK_HEADERS.length);
  var currentHeaders = headerRange.getValues()[0];
  var isHeaderRowEmpty = currentHeaders.every(function (value) {
    return value === "";
  });

  if (isHeaderRowEmpty) {
    return {
      ok: true,
      isEmpty: true,
    };
  }

  var normalizedHeaders = currentHeaders.map(function (value) {
    return String(value).trim();
  });

  return {
    ok: normalizedHeaders.join("|") === BUG_BOOK_HEADERS.join("|"),
    isEmpty: false,
  };
}

function getHeaderDiagnostics_(sheet) {
  var headerState = inspectHeaderState_(sheet);

  if (headerState.isEmpty) {
    return createCheck_(
      true,
      "Sheet is empty and ready. Bug Book will add the header row on the first save."
    );
  }

  if (!headerState.ok) {
    return createCheck_(
      false,
      "Sheet headers do not match the expected Bug Book schema."
    );
  }

  return createCheck_(
    true,
    "Sheet headers already match the expected Bug Book schema."
  );
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

function createCheck_(ok, message, skipped) {
  return {
    ok: ok,
    skipped: Boolean(skipped),
    message: message,
  };
}

function buildDiagnosticsResponse_(diagnostics, sheetName) {
  var checkOrder = [
    "endpoint",
    "scriptProperties",
    "apiKey",
    "spreadsheet",
    "sheet",
    "headers",
  ];
  var overallOk = checkOrder.every(function (key) {
    var check = diagnostics[key];
    return check.ok || check.skipped;
  });
  var summaryMessage = overallOk
    ? 'Bug Book setup is complete. The "' +
      sheetName +
      '" sheet is ready for entries.'
    : getFirstFailingMessage_(diagnostics, checkOrder) ||
      "Bug Book setup is not ready yet.";

  return {
    ok: overallOk,
    message: summaryMessage,
    sheetName: sheetName,
    checks: diagnostics,
  };
}

function getFirstFailingMessage_(diagnostics, checkOrder) {
  for (var index = 0; index < checkOrder.length; index += 1) {
    var key = checkOrder[index];
    if (!diagnostics[key].ok && !diagnostics[key].skipped) {
      return diagnostics[key].message;
    }
  }

  return "";
}

function logError_(error) {
  console.error(error);
  Logger.log(error && error.stack ? error.stack : error);
}
