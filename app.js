(function () {
  "use strict";

  var ALLOWED_SCORES = [2, 1, 0, -1, -2];
  var MINUTE_STEP = 15;
  var MAX_MINUTES = 12 * 60;
  var settingsStore = window.BugBookSettingsStore;
  var config = settingsStore.getAppConfig();
  var form = document.getElementById("entry-form");
  var statusEl = document.getElementById("status");
  var submitButton = document.getElementById("submit-button");
  var entryDateInput = document.getElementById("entry-date");
  var creativeMinutesInput = document.getElementById("creative-hours");
  var socialMinutesInput = document.getElementById("social-hours");
  var isSubmitting = false;
  var hasAppSetup = settingsStore.hasRequiredSettings(config);

  function getTodayLocalDate() {
    var now = new Date();
    var tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;

    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  }

  function setStatus(message, type, options) {
    var nextOptions = options || {};

    statusEl.className = "status";
    statusEl.classList.add("status-" + type);
    statusEl.textContent = message;

    if (nextOptions.scrollIntoView) {
      focusStatus();
    }
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

  function parseMinutes(rawValue) {
    if (rawValue === "") {
      return NaN;
    }

    return Number(rawValue);
  }

  function formatMinutesLabel(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    var parts = [];

    if (hours > 0) {
      parts.push(hours + " hour" + (hours === 1 ? "" : "s"));
    }

    if (minutes > 0 || totalMinutes === 0) {
      parts.push(minutes + " minute" + (minutes === 1 ? "" : "s"));
    }

    return parts.join(" ");
  }

  function populateMinuteSelect(selectEl, placeholderLabel) {
    var fragment = document.createDocumentFragment();
    var placeholderOption = document.createElement("option");

    placeholderOption.value = "";
    placeholderOption.textContent = placeholderLabel;
    fragment.appendChild(placeholderOption);

    for (
      var totalMinutes = 0;
      totalMinutes <= MAX_MINUTES;
      totalMinutes += MINUTE_STEP
    ) {
      var option = document.createElement("option");
      option.value = String(totalMinutes);
      option.textContent = formatMinutesLabel(totalMinutes);
      fragment.appendChild(option);
    }

    selectEl.replaceChildren(fragment);
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
    var creativeMinutes = parseMinutes(
      String(formData.get("creativeMinutes") || "")
    );
    var socialMinutes = parseMinutes(String(formData.get("socialMinutes") || ""));

    return {
      apiKey: config.apiKey,
      entryDate: String(formData.get("entryDate") || ""),
      score: score,
      creativeMinutes: creativeMinutes,
      socialMinutes: socialMinutes,
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

    if (
      !Number.isFinite(payload.creativeMinutes) ||
      payload.creativeMinutes < 0
    ) {
      return "Creative minutes must be a non-negative number.";
    }

    if (!Number.isFinite(payload.socialMinutes) || payload.socialMinutes < 0) {
      return "Social minutes must be a non-negative number.";
    }

    if (!payload.dayDescription) {
      return "Add a brief description of the day.";
    }

    if (!payload.scoreReason) {
      return "Explain why the day got this score.";
    }

    return "";
  }

  function focusStatus() {
    statusEl.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    if (typeof statusEl.focus === "function") {
      try {
        statusEl.focus({
          preventScroll: true,
        });
      } catch (error) {
        statusEl.focus();
      }
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
        "warning",
        {
          scrollIntoView: true,
        }
      );
      return;
    }

    if (navigator.onLine === false) {
      setStatus(
        "Could not save entry. An internet connection is required.",
        "error",
        {
          scrollIntoView: true,
        }
      );
      return;
    }

    var payload = buildPayload(new FormData(form));
    var validationMessage = validatePayload(payload);

    if (validationMessage) {
      setStatus(validationMessage, "error", {
        scrollIntoView: true,
      });
      return;
    }

    setSubmitting(true);
    setStatus("Saving entry...", "neutral");

    try {
      var result = await settingsStore.requestJson(
        config.endpointUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          timeoutMs: config.requestTimeoutMs,
        }
      );
      var response = result.response;
      var responseBody = result.body;

      if (!response.ok || !responseBody.ok) {
        throw new Error(
          responseBody.message ||
            "The sheet endpoint rejected this request."
        );
      }

      resetForm();
      setStatus(
        "Saved entry for " + (responseBody.entryDate || payload.entryDate) + ".",
        "success",
        {
          scrollIntoView: true,
        }
      );
    } catch (error) {
      if (error.name === "AbortError") {
        setStatus(
          "Bug Book could not confirm whether the entry saved before the request timed out. Check your sheet before retrying to avoid duplicates.",
          "warning",
          {
            scrollIntoView: true,
          }
        );
      } else if (
        error.code === "NETWORK" ||
        error.code === "EMPTY_RESPONSE" ||
        error.code === "INVALID_JSON"
      ) {
        setStatus(
          "Bug Book could not confirm whether the entry saved. Check your sheet before retrying to avoid duplicates.",
          "warning",
          {
            scrollIntoView: true,
          }
        );
      } else {
        setStatus(
          error.message ||
            "Could not save entry. Please check your connection and try again.",
          "error",
          {
            scrollIntoView: true,
          }
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
    populateMinuteSelect(creativeMinutesInput, "Select creative minutes");
    populateMinuteSelect(socialMinutesInput, "Select social minutes");
    entryDateInput.value = getTodayLocalDate();
    form.addEventListener("submit", handleSubmit);
    registerServiceWorker();
    window.addEventListener("pageshow", refreshSetupState);
    refreshSetupState();
  }

  init();
})();
