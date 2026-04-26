(function () {
  "use strict";

  var STORAGE_KEY = "bugBookSettings";
  var DEFAULT_CONFIG = {
    endpointUrl: "",
    apiKey: "",
    apiVersion: "v1",
    source: "pwa",
    appName: "Bug Book",
    requestTimeoutMs: 45000,
  };

  function normalizeStoredSettings(rawSettings) {
    var settings = rawSettings && typeof rawSettings === "object" ? rawSettings : {};

    return {
      endpointUrl: String(settings.endpointUrl || "").trim(),
      apiKey: String(settings.apiKey || "").trim(),
    };
  }

  function getStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function isValidEndpointUrl(value) {
    if (!value) {
      return false;
    }

    try {
      var parsedUrl = new URL(value);
      return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    } catch (error) {
      return false;
    }
  }

  function createRequestError(code, message, details) {
    var error = new Error(message);
    error.code = code;
    Object.assign(error, details || {});
    return error;
  }

  function getStoredSettings() {
    var storage = getStorage();
    if (!storage) {
      return normalizeStoredSettings();
    }

    try {
      return normalizeStoredSettings(JSON.parse(storage.getItem(STORAGE_KEY) || "{}"));
    } catch (error) {
      return normalizeStoredSettings();
    }
  }

  function validateStoredSettings(rawSettings) {
    var settings = normalizeStoredSettings(rawSettings);

    if (!settings.endpointUrl) {
      return "Enter your Apps Script endpoint URL.";
    }

    if (!isValidEndpointUrl(settings.endpointUrl)) {
      return "Enter a valid http:// or https:// Apps Script endpoint URL.";
    }

    if (!settings.apiKey) {
      return "Enter your Apps Script API key.";
    }

    return "";
  }

  function saveStoredSettings(rawSettings) {
    var storage = getStorage();
    var settings = normalizeStoredSettings(rawSettings);
    var validationMessage = validateStoredSettings(settings);

    if (!storage) {
      throw new Error(
        "This browser cannot save local settings for Bug Book right now."
      );
    }

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(settings));

    return settings;
  }

  function clearStoredSettings() {
    var storage = getStorage();

    if (!storage) {
      throw new Error(
        "This browser cannot clear local settings for Bug Book right now."
      );
    }

    storage.removeItem(STORAGE_KEY);
  }

  function getAppConfig() {
    return Object.assign({}, DEFAULT_CONFIG, getStoredSettings());
  }

  function hasRequiredSettings(rawSettings) {
    var settings = rawSettings
      ? normalizeStoredSettings(rawSettings)
      : getStoredSettings();

    return Boolean(settings.endpointUrl && settings.apiKey);
  }

  function buildDiagnosticsUrl(endpointUrl, apiKey) {
    var url = new URL(endpointUrl);

    if (apiKey) {
      url.searchParams.set("apiKey", apiKey);
    }

    return url.toString();
  }

  async function requestJson(url, options) {
    var requestOptions = options || {};
    var method = requestOptions.method || "GET";
    var timeoutMs =
      typeof requestOptions.timeoutMs === "number"
        ? requestOptions.timeoutMs
        : DEFAULT_CONFIG.requestTimeoutMs;
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    var response;
    var responseText;

    try {
      try {
        response = await fetch(url, {
          method: method,
          headers: requestOptions.headers || {},
          body: requestOptions.body,
          signal: controller.signal,
        });
      } catch (error) {
        if (error.name === "AbortError") {
          throw error;
        }

        throw createRequestError(
          "NETWORK",
          "Could not reach the Bug Book endpoint."
        );
      }

      responseText = await response.text();
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (!responseText) {
      throw createRequestError(
        "EMPTY_RESPONSE",
        "The Bug Book endpoint returned an empty response.",
        {
          httpStatus: response.status,
        }
      );
    }

    try {
      return {
        response: response,
        body: JSON.parse(responseText),
      };
    } catch (error) {
      throw createRequestError(
        "INVALID_JSON",
        "The Bug Book endpoint returned invalid JSON.",
        {
          httpStatus: response.status,
          responseText: responseText.slice(0, 200),
        }
      );
    }
  }

  async function runSetupDiagnostics(rawSettings, timeoutMs) {
    var settings = normalizeStoredSettings(rawSettings);
    var validationMessage = validateStoredSettings(settings);

    if (validationMessage) {
      throw new Error(validationMessage);
    }

    return requestJson(buildDiagnosticsUrl(settings.endpointUrl, settings.apiKey), {
      timeoutMs: timeoutMs,
    });
  }

  window.BugBookSettingsStore = {
    getAppConfig: getAppConfig,
    getStoredSettings: getStoredSettings,
    validateStoredSettings: validateStoredSettings,
    saveStoredSettings: saveStoredSettings,
    clearStoredSettings: clearStoredSettings,
    hasRequiredSettings: hasRequiredSettings,
    requestJson: requestJson,
    runSetupDiagnostics: runSetupDiagnostics,
  };
})();
