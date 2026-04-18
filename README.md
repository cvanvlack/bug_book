# Bug Book

Bug Book is a lightweight personal PWA for logging one daily journal entry at a
time and appending it to Google Sheets through a Google Apps Script web app.

## What is in this repo

- `index.html`, `styles.css`, `app.js`: the static GitHub Pages frontend
- `config.js`, `config.example.js`: runtime configuration for the frontend
- `manifest.webmanifest`, `sw.js`, `icons/`: installable PWA assets
- `apps-script/Code.gs`, `apps-script/appsscript.json`: the Apps Script backend
- `design.md`: the original product/design spec

## Security note

This app uses a shared API key embedded in a static frontend. That is convenient,
not secure. Anyone who can inspect the deployed site can extract the key. Keep
the Google Sheet private and treat this as low-risk personal tooling only.

## Frontend configuration

Edit `config.js` before local testing or deployment:

```js
window.BUG_BOOK_CONFIG = {
  endpointUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  apiKey: "YOUR_SHARED_SECRET",
  apiVersion: "v1",
  source: "pwa",
  appName: "Bug Book",
  requestTimeoutMs: 15000,
};
```

`config.example.js` is the same shape with placeholder values so the contract is
easy to reference.

## Google Sheet schema

Create a spreadsheet with a tab named `entries`. The backend will auto-create
the tab if it does not exist and will seed the header row if the sheet is empty.

Expected columns:

```text
entry_date | score | creative_hours | social_hours | day_description | score_reason | submitted_at_local | client_timezone | received_at_script | api_version | user_agent | source
```

## Apps Script setup

1. Create a new Apps Script project.
2. Copy the contents of `apps-script/Code.gs` into the project.
3. Replace the generated `appsscript.json` with `apps-script/appsscript.json`.
4. In Apps Script, open `Project Settings` and set these script properties:
   - `SPREADSHEET_ID`
   - `SHEET_NAME` (optional, defaults to `entries`)
   - `EXPECTED_API_KEY`
5. Deploy the script as a web app.
6. Set execution access so your browser-hosted frontend can call it.
7. Put the deployed web app URL and matching API key into `config.js`.

The endpoint exposes:

- `GET`: health message
- `POST`: append a validated entry row

Example request body:

```json
{
  "apiKey": "YOUR_SHARED_SECRET",
  "entryDate": "2026-04-17",
  "score": -1,
  "creativeHours": 1.5,
  "socialHours": 0.5,
  "dayDescription": "Low-energy day, but made some progress.",
  "scoreReason": "Tired and scattered, but still moved things forward.",
  "submittedAtLocal": "2026-04-18T09:14:52.000Z",
  "clientTimezone": "America/Toronto",
  "apiVersion": "v1",
  "userAgent": "Mozilla/5.0 ...",
  "source": "pwa"
}
```

## Local development

Because this repo is plain static HTML/CSS/JS, any local static file server will
work. For example:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## GitHub Pages deployment

This repo is ready to publish as a static site from the repository root.

1. Commit the frontend files to your default branch.
2. Enable GitHub Pages for the repository and publish from the branch/root.
3. Make sure the deployed `config.js` contains the live Apps Script URL and key.
4. Confirm the page loads over HTTPS and that the manifest and service worker
   are being served successfully.

## Manual acceptance checklist

- The app opens to a single-screen form.
- The date defaults to today in local time.
- Score is limited to `+2`, `+1`, `0`, `-1`, `-2`.
- Hours accept only non-negative numeric values.
- Description and score reason are required.
- Failed submissions keep the form data intact.
- Successful submissions clear the form and mention the saved date.
- One successful online submit appends exactly one row to the target sheet.
- The app can be installed as a PWA on supported browsers.
