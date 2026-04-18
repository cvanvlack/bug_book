(function () {
  "use strict";

  var settingsStore = window.BugBookSettingsStore;
  var form = document.getElementById("settings-form");
  var statusEl = document.getElementById("settings-status");
  var statusActionsEl = document.getElementById("settings-status-actions");
  var diagnosticsEl = document.getElementById("settings-diagnostics");
  var diagnosticsListEl = document.getElementById("settings-diagnostics-list");
  var endpointUrlInput = document.getElementById("endpoint-url");
  var apiKeyInput = document.getElementById("api-key");
  var saveButton = document.getElementById("save-settings-button");
  var clearButton = document.getElementById("clear-settings-button");
  var CHECK_LABELS = {
    endpoint: "Apps Script URL",
    scriptProperties: "Backend settings",
    apiKey: "API key",
    spreadsheet: "Spreadsheet",
    sheet: "Sheet tab",
    headers: "Sheet schema",
  };

  function setStatus(message, type, options) {
    var nextOptions = options || {};

    statusEl.className = "status";
    statusEl.classList.add("status-" + type);
    statusEl.textContent = message;

    if (nextOptions.scrollIntoView) {
      focusStatus();
    }
  }

  function setSaving(nextValue) {
    saveButton.disabled = nextValue;
    clearButton.disabled = nextValue;
    saveButton.textContent = nextValue ? "Saving and checking..." : "Save settings";
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

  function clearDiagnostics() {
    diagnosticsListEl.textContent = "";
    diagnosticsEl.hidden = true;
    statusActionsEl.hidden = true;
  }

  function renderDiagnostics(checks) {
    var checkOrder = [
      "endpoint",
      "scriptProperties",
      "apiKey",
      "spreadsheet",
      "sheet",
      "headers",
    ];

    diagnosticsListEl.textContent = "";

    checkOrder.forEach(function (key) {
      var check = checks && checks[key];
      var item;
      var title;
      var message;
      var itemState = "neutral";

      if (!check) {
        return;
      }

      if (!check.skipped) {
        itemState = check.ok ? "success" : "error";
      }

      item = document.createElement("li");
      item.className = "diagnostics-item diagnostics-item-" + itemState;

      title = document.createElement("div");
      title.className = "diagnostics-item-title";
      title.textContent = CHECK_LABELS[key] || key;

      message = document.createElement("div");
      message.className = "diagnostics-item-message";
      message.textContent = check.message;

      item.appendChild(title);
      item.appendChild(message);
      diagnosticsListEl.appendChild(item);
    });

    diagnosticsEl.hidden = diagnosticsListEl.children.length === 0;
  }

  function getVerificationErrorMessage(error) {
    if (error.name === "AbortError") {
      return (
        "Settings were saved on this device, but Bug Book could not finish the setup check before the request timed out."
      );
    }

    if (
      error.code === "NETWORK" ||
      error.code === "EMPTY_RESPONSE" ||
      error.code === "INVALID_JSON"
    ) {
      return (
        "Settings were saved on this device, but Bug Book could not verify the Apps Script response. Double-check the URL and save again."
      );
    }

    return error.message;
  }

  async function verifySavedSettings(savedSettings) {
    var config = settingsStore.getAppConfig();
    var result;

    clearDiagnostics();
    setStatus(
      "Settings saved on this device. Verifying your Apps Script setup...",
      "neutral",
      {
        scrollIntoView: true,
      }
    );

    try {
      result = await settingsStore.runSetupDiagnostics(
        savedSettings,
        config.requestTimeoutMs
      );
      renderDiagnostics(result.body.checks);

      if (!result.response.ok || !result.body.ok) {
        setStatus(
          result.body.message || "Bug Book could not verify your setup yet.",
          "error",
          {
            scrollIntoView: true,
          }
        );
        return false;
      }

      setStatus(
        result.body.message ||
          "Setup verified. Bug Book is ready to save entries on this device.",
        "success",
        {
          scrollIntoView: true,
        }
      );
      statusActionsEl.hidden = false;
      return true;
    } catch (error) {
      setStatus(getVerificationErrorMessage(error), "error", {
        scrollIntoView: true,
      });
      return false;
    }
  }

  function populateForm() {
    var storedSettings = settingsStore.getStoredSettings();

    endpointUrlInput.value = storedSettings.endpointUrl;
    apiKeyInput.value = storedSettings.apiKey;
    clearDiagnostics();

    if (settingsStore.hasRequiredSettings(storedSettings)) {
      setStatus(
        "Saved settings found. You can update them here at any time.",
        "success"
      );
    } else {
      setStatus(
        "Add your Apps Script endpoint URL and API key to finish setup.",
        "warning"
      );
    }
  }

  function getFormSettings() {
    return {
      endpointUrl: endpointUrlInput.value,
      apiKey: apiKeyInput.value,
    };
  }

  async function handleSubmit(event) {
    var savedSettings;

    event.preventDefault();
    setSaving(true);

    try {
      savedSettings = settingsStore.saveStoredSettings(getFormSettings());
      apiKeyInput.value = settingsStore.getStoredSettings().apiKey;
      await verifySavedSettings(savedSettings);
    } catch (error) {
      setStatus(error.message, "error", {
        scrollIntoView: true,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (
      !window.confirm(
        "Clear the saved Apps Script endpoint URL and API key from this browser?"
      )
    ) {
      return;
    }

    try {
      settingsStore.clearStoredSettings();
      form.reset();
      clearDiagnostics();
      setStatus(
        "Saved settings were cleared from this browser.",
        "warning",
        {
          scrollIntoView: true,
        }
      );
    } catch (error) {
      setStatus(error.message, "error", {
        scrollIntoView: true,
      });
    }
  }

  function init() {
    form.addEventListener("submit", handleSubmit);
    clearButton.addEventListener("click", handleClear);
    window.addEventListener("pageshow", populateForm);
    populateForm();
  }

  init();
})();
