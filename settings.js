(function () {
  "use strict";

  var settingsStore = window.BugBookSettingsStore;
  var form = document.getElementById("settings-form");
  var statusEl = document.getElementById("settings-status");
  var endpointUrlInput = document.getElementById("endpoint-url");
  var apiKeyInput = document.getElementById("api-key");
  var saveButton = document.getElementById("save-settings-button");
  var clearButton = document.getElementById("clear-settings-button");

  function setStatus(message, type) {
    statusEl.className = "status";
    statusEl.classList.add("status-" + type);
    statusEl.textContent = message;
  }

  function setSaving(nextValue) {
    saveButton.disabled = nextValue;
    clearButton.disabled = nextValue;
    saveButton.textContent = nextValue ? "Saving..." : "Save settings";
  }

  function populateForm() {
    var storedSettings = settingsStore.getStoredSettings();

    endpointUrlInput.value = storedSettings.endpointUrl;
    apiKeyInput.value = storedSettings.apiKey;

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

  function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      settingsStore.saveStoredSettings(getFormSettings());
      apiKeyInput.value = settingsStore.getStoredSettings().apiKey;
      setStatus(
        "Settings saved on this device. You can return to the entry form now.",
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
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
      setStatus(
        "Saved settings were cleared from this browser.",
        "warning"
      );
    } catch (error) {
      setStatus(error.message, "error");
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
