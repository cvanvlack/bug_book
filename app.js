(function () {
  "use strict";

  var ALLOWED_SCORES = [2, 1, 0, -1, -2];
  var settingsStore = window.BugBookSettingsStore;
  var config = settingsStore.getAppConfig();
  var form = document.getElementById("entry-form");
  var statusEl = document.getElementById("status");
  var submitButton = document.getElementById("submit-button");
  var entryDateInput = document.getElementById("entry-date");
  var creativeMinutesInput = document.getElementById("creative-hours");
  var socialMinutesInput = document.getElementById("social-hours");
  var meditationMinutesInput = document.getElementById("meditation-minutes");
  var exerciseMinutesInput = document.getElementById("exercise-minutes");
  var outdoorMinutesInput = document.getElementById("outdoor-minutes");
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

  function getFormValue(formData, key) {
    var value = formData.get(key);

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  }

  function parseMinutes(rawValue) {
    var value = String(rawValue).trim();

    if (value === "") {
      return NaN;
    }

    return Number(value);
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

  function populateMinuteSelect(selectEl, placeholderLabel, stepMinutes, maxMinutes) {
    var fragment = document.createDocumentFragment();
    var placeholderOption = document.createElement("option");

    placeholderOption.value = "";
    placeholderOption.textContent = placeholderLabel;
    placeholderOption.disabled = true;
    placeholderOption.hidden = true;
    placeholderOption.selected = true;
    fragment.appendChild(placeholderOption);

    for (
      var totalMinutes = 0;
      totalMinutes <= maxMinutes;
      totalMinutes += stepMinutes
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

  function createSubmissionId() {
    return (
      "bb-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function buildPayload(formData) {
    var score = Number(formData.get("score"));
    var creativeMinutes = parseMinutes(getFormValue(formData, "creativeMinutes"));
    var socialMinutes = parseMinutes(getFormValue(formData, "socialMinutes"));
    var meditationMinutes = parseMinutes(
      getFormValue(formData, "meditationMinutes")
    );
    var exerciseMinutes = parseMinutes(getFormValue(formData, "exerciseMinutes"));
    var outdoorMinutes = parseMinutes(getFormValue(formData, "outdoorMinutes"));

    return {
      apiKey: config.apiKey,
      submissionId: createSubmissionId(),
      entryDate: getFormValue(formData, "entryDate"),
      score: score,
      creativeMinutes: creativeMinutes,
      socialMinutes: socialMinutes,
      meditationMinutes: meditationMinutes,
      exerciseMinutes: exerciseMinutes,
      outdoorMinutes: outdoorMinutes,
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

  function createSaveError(message, details) {
    var error = new Error(message);
    Object.assign(error, details || {});
    return error;
  }

  function formatHttpStatus(error) {
    if (!error.httpStatus) {
      return "";
    }

    return " HTTP status: " + error.httpStatus + ".";
  }

  function formatSaveErrorMessage(error, submissionId) {
    var traceText = " Trace ID: " + submissionId + ".";

    if (error.name === "AbortError") {
      return (
        "Bug Book could not confirm whether the entry saved before the 45-second request timeout. Check your sheet before retrying to avoid duplicates." +
        traceText
      );
    }

    if (error.code === "NETWORK") {
      return (
        "Could not reach the Apps Script endpoint. Check your connection, endpoint URL, deployment permissions, and browser Network tab." +
        traceText
      );
    }

    if (error.code === "EMPTY_RESPONSE") {
      return (
        "Apps Script returned an empty response." +
        formatHttpStatus(error) +
        " Check Apps Script executions for this trace before retrying." +
        traceText
      );
    }

    if (error.code === "INVALID_JSON") {
      return (
        "Apps Script returned a response Bug Book could not read as JSON." +
        formatHttpStatus(error) +
        " Check the deployment URL and Apps Script executions for this trace." +
        traceText
      );
    }

    return (
      (error.message ||
        "Could not save entry. Please check your connection and try again.") +
      formatHttpStatus(error) +
      traceText
    );
  }

  function getSaveStatusType(error) {
    if (
      error.name === "AbortError" ||
      error.code === "EMPTY_RESPONSE" ||
      error.code === "INVALID_JSON"
    ) {
      return "warning";
    }

    return "error";
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

    if (
      !Number.isInteger(payload.meditationMinutes) ||
      payload.meditationMinutes < 0 ||
      payload.meditationMinutes > 60
    ) {
      return "Meditation minutes must be between 0 and 60.";
    }

    if (
      !Number.isInteger(payload.exerciseMinutes) ||
      payload.exerciseMinutes < 0 ||
      payload.exerciseMinutes > 6 * 60 ||
      payload.exerciseMinutes % 5 !== 0
    ) {
      return "Exercise minutes must be between 0 and 360 in 5-minute increments.";
    }

    if (
      !Number.isInteger(payload.outdoorMinutes) ||
      payload.outdoorMinutes < 0 ||
      payload.outdoorMinutes > 24 * 60 ||
      payload.outdoorMinutes % 15 !== 0
    ) {
      return "Outdoor minutes must be between 0 and 1440 in 15-minute increments.";
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
    setStatus(
      "Saving entry... This can take up to 45 seconds. Trace ID: " +
        payload.submissionId +
        ".",
      "neutral",
      {
        scrollIntoView: true,
      }
    );

    try {
      var result = await settingsStore.requestJson(
        config.endpointUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
          timeoutMs: config.requestTimeoutMs,
        }
      );
      var response = result.response;
      var responseBody = result.body;

      if (!response.ok || !responseBody.ok) {
        throw createSaveError(
          responseBody.message || "The sheet endpoint rejected this request.",
          {
            httpStatus: response.status,
            submissionId: responseBody.submissionId || payload.submissionId,
          }
        );
      }

      resetForm();
      setStatus(
        "Saved entry for " +
          (responseBody.entryDate || payload.entryDate) +
          ". Trace ID: " +
          (responseBody.submissionId || payload.submissionId) +
          ".",
        "success",
        {
          scrollIntoView: true,
        }
      );
    } catch (error) {
      setStatus(
        formatSaveErrorMessage(error, payload.submissionId),
        getSaveStatusType(error),
        {
          scrollIntoView: true,
        }
      );
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
    populateMinuteSelect(creativeMinutesInput, "Select creative minutes", 15, 12 * 60);
    populateMinuteSelect(socialMinutesInput, "Select social minutes", 15, 12 * 60);
    populateMinuteSelect(
      meditationMinutesInput,
      "Select meditation minutes",
      1,
      60
    );
    populateMinuteSelect(
      exerciseMinutesInput,
      "Select exercise minutes",
      5,
      6 * 60
    );
    populateMinuteSelect(
      outdoorMinutesInput,
      "Select outdoor minutes",
      15,
      24 * 60
    );
    entryDateInput.value = getTodayLocalDate();
    form.addEventListener("submit", handleSubmit);
    registerServiceWorker();
    window.addEventListener("pageshow", refreshSetupState);
    refreshSetupState();
  }

  init();
})();
