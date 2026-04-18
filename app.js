(function () {
  "use strict";

  var ALLOWED_SCORES = [2, 1, 0, -1, -2];
  var settingsStore = window.BugBookSettingsStore;
  var config = settingsStore.getAppConfig();
  var form = document.getElementById("entry-form");
  var statusEl = document.getElementById("status");
  var submitButton = document.getElementById("submit-button");
  var entryDateInput = document.getElementById("entry-date");
  var isSubmitting = false;
  var hasAppSetup = settingsStore.hasRequiredSettings(config);

  function getTodayLocalDate() {
    var now = new Date();
    var tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;

    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  }

  function setStatus(message, type) {
    statusEl.className = "status";
    statusEl.classList.add("status-" + type);
    statusEl.textContent = message;
  }

  function setSubmitting(nextValue) {
    isSubmitting = nextValue;
    submitButton.textContent = nextValue ? "Saving..." : "Save entry";
    submitButton.disabled = nextValue || !hasAppSetup;
  }

  function refreshSetupState() {
    config = settingsStore.getAppConfig();
    hasAppSetup = settingsStore.hasRequiredSettings(config);
    submitButton.disabled = isSubmitting || !hasAppSetup;

    if (hasAppSetup) {
      setStatus("Ready to save your next entry.", "neutral");
    } else {
      setStatus(
        "Missing setup. Open Settings to add your Apps Script endpoint URL and API key for this browser.",
        "warning"
      );
    }
  }

  function isIsoDate(value) {
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

  function getTrimmed(formData, key) {
    return String(formData.get(key) || "").trim();
  }

  function parseHours(rawValue) {
    if (rawValue === "") {
      return NaN;
    }

    return Number(rawValue);
  }

  function getLocalTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    var hours = String(now.getHours()).padStart(2, "0");
    var minutes = String(now.getMinutes()).padStart(2, "0");
    var seconds = String(now.getSeconds()).padStart(2, "0");
    var offsetMinutes = -now.getTimezoneOffset();
    var sign = offsetMinutes >= 0 ? "+" : "-";
    var offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
      2,
      "0"
    );
    var offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day +
      "T" +
      hours +
      ":" +
      minutes +
      ":" +
      seconds +
      sign +
      offsetHours +
      ":" +
      offsetRemainder
    );
  }

  function buildPayload(formData) {
    var score = Number(formData.get("score"));
    var creativeHours = parseHours(String(formData.get("creativeHours") || ""));
    var socialHours = parseHours(String(formData.get("socialHours") || ""));

    return {
      apiKey: config.apiKey,
      entryDate: String(formData.get("entryDate") || ""),
      score: score,
      creativeHours: creativeHours,
      socialHours: socialHours,
      dayDescription: getTrimmed(formData, "dayDescription"),
      scoreReason: getTrimmed(formData, "scoreReason"),
      submittedAtLocal: getLocalTimestamp(),
      clientTimezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      apiVersion: config.apiVersion,
      userAgent: navigator.userAgent,
      source: config.source,
    };
  }

  function validatePayload(payload) {
    if (!isIsoDate(payload.entryDate)) {
      return "Enter a valid entry date.";
    }

    if (!ALLOWED_SCORES.includes(payload.score)) {
      return "Choose a score from +2, +1, 0, -1, or -2.";
    }

    if (!Number.isFinite(payload.creativeHours) || payload.creativeHours < 0) {
      return "Creative hours must be a non-negative number.";
    }

    if (!Number.isFinite(payload.socialHours) || payload.socialHours < 0) {
      return "Social hours must be a non-negative number.";
    }

    if (!payload.dayDescription) {
      return "Add a brief description of the day.";
    }

    if (!payload.scoreReason) {
      return "Explain why the day got this score.";
    }

    return "";
  }

  async function postJsonWithTimeout(url, payload, timeoutMs) {
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    try {
      return await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function parseJsonResponse(response) {
    var rawText = await response.text();

    if (!rawText) {
      throw new Error("The sheet endpoint returned an empty response.");
    }

    try {
      return JSON.parse(rawText);
    } catch (error) {
      throw new Error("The sheet endpoint returned invalid JSON.");
    }
  }

  function resetForm() {
    form.reset();
    entryDateInput.value = getTodayLocalDate();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!config.endpointUrl || !config.apiKey) {
      setStatus(
        "Missing setup. Open Settings to add your Apps Script endpoint URL and API key for this browser.",
        "warning"
      );
      return;
    }

    if (navigator.onLine === false) {
      setStatus(
        "Could not save entry. An internet connection is required.",
        "error"
      );
      return;
    }

    var payload = buildPayload(new FormData(form));
    var validationMessage = validatePayload(payload);

    if (validationMessage) {
      setStatus(validationMessage, "error");
      return;
    }

    setSubmitting(true);
    setStatus("Saving entry...", "neutral");

    try {
      var response = await postJsonWithTimeout(
        config.endpointUrl,
        payload,
        config.requestTimeoutMs
      );
      var responseBody = await parseJsonResponse(response);

      if (!response.ok || !responseBody.ok) {
        throw new Error(
          responseBody.message ||
            "The sheet endpoint rejected this request."
        );
      }

      resetForm();
      setStatus(
        "Saved entry for " + (responseBody.entryDate || payload.entryDate) + ".",
        "success"
      );
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus(
          "Could not save entry. The request timed out after " +
            Math.round(config.requestTimeoutMs / 1000) +
            " seconds.",
          "error"
        );
      } else {
        setStatus(
          error.message ||
            "Could not save entry. Please check your connection and try again.",
          "error"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function (error) {
        console.warn("Service worker registration failed", error);
      });
    });
  }

  function init() {
    entryDateInput.value = getTodayLocalDate();
    form.addEventListener("submit", handleSubmit);
    registerServiceWorker();
    window.addEventListener("pageshow", refreshSetupState);
    refreshSetupState();
  }

  init();
})();
