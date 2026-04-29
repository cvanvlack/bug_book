# Bug Book

Bug Book is a simple daily journal web app. You open it in your browser, fill
out one entry, and it saves the result into a Google Sheet.

## How to deploy your own copy

This guide is written for a nontechnical user. Follow the steps in order.

### Step 1: Make your own copy on GitHub

1. Open this repo on GitHub.
2. Click `Fork` in the top-right corner.
3. Create the fork in your own GitHub account.

When this is done, you will have your own copy of the project at:

```text
https://github.com/YOUR-USERNAME/bug_book
```

Helpful links:

- [Fork a repository](https://docs.github.com/articles/fork-a-repo)

### Step 2: Clone your fork to your computer

If you want to edit the app before publishing it, the easiest path is GitHub
Desktop.

1. Install [GitHub Desktop](https://desktop.github.com/).
2. Open your fork on GitHub.
3. Click `Code`, then click `Open with GitHub Desktop`.
4. Choose where to save the project on your computer.
5. Click `Clone`.

This gives you a local copy of your fork on your computer.

Helpful links:

- [Clone a repository from GitHub to GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop)

### Step 3: Make changes and push them to your GitHub copy

If you do not want to change anything yet, you can skip to Step 4. Your fork is
already on GitHub.

If you do want to change text, colors, or other files:

1. Open the cloned folder on your computer.
2. Edit the files you want to change.
3. Go back to GitHub Desktop.
4. In the left sidebar, review the changed files.
5. At the bottom, type a short summary such as `Update app text`.
6. Click `Commit to main`.
7. Click `Push origin`.

That sends your local changes to your GitHub fork.

Helpful links:

- [Commit changes in GitHub Desktop](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop)
- [Push changes to GitHub from GitHub Desktop](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/making-changes-in-a-branch/pushing-changes-to-github-from-github-desktop)

### Step 4: Turn on GitHub Pages

This is what makes your app live on the web.

1. Open your fork on GitHub.
2. Click `Settings`.
3. In the left menu, click `Pages`.
4. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
5. Choose branch `main`.
6. Choose folder `/ (root)`.
7. Click `Save`.

After GitHub finishes publishing, your app will be live at:

```text
https://YOUR-USERNAME.github.io/bug_book/
```

Helpful links:

- [Configure a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Step 5: Create the Google Sheet

1. Open [Google Sheets](https://docs.google.com/spreadsheets/).
2. Create a new blank spreadsheet.
3. Rename the first tab to `bug_book`.
4. Copy the spreadsheet ID from the URL.

The spreadsheet ID is the long text between `/d/` and `/edit`.

Example:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit#gid=0
```

### Step 6: Create the Apps Script project

1. Open [script.google.com](https://script.google.com/).
2. Click `New project`.
3. Rename it to something like `Bug Book Backend`.
4. Delete the sample code in the editor.
5. Copy everything from `apps-script/Code.gs` in this repo and paste it into the
   Apps Script editor.
6. Open `Project Settings`.
7. Turn on `Show "appsscript.json" manifest file in editor` if needed.
8. Open `appsscript.json`.
9. Replace its contents with the file `apps-script/appsscript.json` from this
   repo.

Helpful links:

- [Create a standalone Apps Script project](https://developers.google.com/apps-script/guides/projects)

### Step 7: Add the Apps Script settings

In Apps Script, stay in `Project Settings` and add these script properties:

- `SPREADSHEET_ID` = your spreadsheet ID
- `EXPECTED_API_KEY` = a secret key you make up yourself
- `SHEET_NAME` = optional, defaults to `bug_book`

If you want the easiest setup, leave `SHEET_NAME` out and keep your tab named
`bug_book`.

### Step 8: Deploy the Apps Script web app

1. In Apps Script, click `Deploy`.
2. Click `New deployment`.
3. For deployment type, choose `Web app`.
4. Set `Execute as` to yourself.
5. Set `Who has access` to `Anyone`.
6. Click `Deploy`.
7. Approve the Google permissions if asked.
8. Copy the web app URL.

### Step 9: Connect the website to the Apps Script

1. Open your live Bug Book site on GitHub Pages at
   `https://YOUR-USERNAME.github.io/bug_book/`, replacing `YOUR-USERNAME`
   with your GitHub username.
2. Open `Settings` in the app.
3. Paste in:
   - the Apps Script web app URL
   - the same API key you used for `EXPECTED_API_KEY`
4. Click `Save settings`.
5. Wait for the setup check to finish. A successful check should confirm:
   - the Apps Script URL is reachable
   - the API key was accepted
   - the backend script properties are configured
   - the spreadsheet and target sheet are ready
6. Go back to the main page.
7. Submit a test entry.

If the test works, your entry should appear in the `bug_book` tab in your Google
Sheet.

### Step 10: Keep Bug Book on your phone

If you want Bug Book to feel like a real app and stay easy to find, add it to
your phone's home screen.

#### On iPhone or iPad

1. Open your live Bug Book site in `Safari`.
2. Tap the `Share` button.
3. Scroll down and tap `Add to Home Screen`.
4. Change the name if you want.
5. Tap `Add`.

Bug Book will now appear on your home screen like an app. The next time you
want to use it, tap that icon instead of opening Safari and typing the address
again.

#### On Android

1. Open your live Bug Book site in `Chrome`.
2. Tap the browser menu.
3. Look for `Install app` or `Add to Home screen`.
4. Tap it, then confirm.

If your phone shows an install prompt at the bottom of the screen, you can use
that instead.

#### Why this helps

- It keeps Bug Book one tap away.
- It makes the app feel more like a normal phone app.
- It is easier to remember to use when the icon stays on your home screen.

## Reference details

### Google Sheet schema

Default sheet name: `bug_book`

Expected columns:

```text
entry_date | score | creative_minutes | social_minutes | meditation_minutes | exercise_minutes | outdoor_minutes | day_description | score_reason | submitted_at_local | client_timezone | received_at_script | api_version | user_agent | source
```

If the `bug_book` tab is empty, the backend will add this header row
automatically.

If the `bug_book` tab does not exist yet, the backend can create it
automatically during setup verification or the first successful save.

### Apps Script request format

The web app supports:

- `GET` for a health check
- `POST` for saving an entry

Example request body:

```json
{
  "apiKey": "YOUR_SHARED_SECRET",
  "entryDate": "2026-04-17",
  "score": -1,
  "creativeMinutes": 90,
  "socialMinutes": 30,
  "meditationMinutes": 15,
  "exerciseMinutes": 45,
  "outdoorMinutes": 480,
  "dayDescription": "Low-energy day, but made some progress.",
  "scoreReason": "Tired and scattered, but still moved things forward.",
  "submittedAtLocal": "2026-04-18T09:14:52.000Z",
  "clientTimezone": "America/Toronto",
  "apiVersion": "v1",
  "userAgent": "Mozilla/5.0 ...",
  "source": "pwa"
}
```

### What is in this repo

- `index.html`, `settings.html`, `styles.css`: the static site
- `app.js`, `settings.js`, `settings-store.js`: app behavior and saved settings
- `manifest.webmanifest`, `sw.js`, `icons/`: installable PWA files
- `apps-script/Code.gs`, `apps-script/appsscript.json`: the Google Apps Script backend
- `design.md`: the original product notes

### Security note

This app stores the Apps Script URL and API key in browser local storage for the
current device and site. That keeps them out of the repo, but it is not strong
secret storage. Keep the Google Sheet private and treat this as personal,
low-risk tooling.

### Local development

Because this repo is plain static HTML, CSS, and JavaScript, any local static
file server will work. For example:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

### Manual acceptance checklist

- Opening the app without saved settings shows a clear setup warning and a link to `Settings`.
- Saving settings in `settings.html` stores them locally and allows the main form to submit.
- Saving settings in `settings.html` also runs a setup check and reports whether the URL, API key, backend settings, and sheet are ready.
- The app opens to a single-screen form.
- The date defaults to today in local time.
- Score is limited to `+2`, `+1`, `0`, `-1`, `-2`.
- Creative and social minutes accept non-negative values, outdoor minutes allows 0 to 1440 in 15-minute increments, meditation stays 0 to 60, and exercise stays 0 to 360 in 5-minute increments.
- Description and score reason are required.
- Failed submissions keep the form data intact.
- Successful submissions clear the form, mention the saved date, and scroll the success state into view.
- Network or timeout failures make it clear when the save result is unknown so you can check the sheet before retrying.
- One successful online submit appends exactly one row to the target sheet.
- The app can be installed as a PWA on supported browsers.
