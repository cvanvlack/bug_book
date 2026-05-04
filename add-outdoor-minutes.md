# Spreadsheet change for `outdoor_minutes`

The code now expects a new sheet column named `outdoor_minutes`.

Because you do **not** need backward compatibility, the only manual spreadsheet
work is to update the header layout so it matches the new backend schema
exactly.

## What to change in Google Sheets

1. Open the `bug_book` tab.
2. Insert one new column after `exercise_minutes`.
3. Rename that new header cell to `outdoor_minutes`.
4. Leave older rows blank or fill them manually however you want.

## Required header order

The header row now needs to be:

```text
entry_date | score | creative_minutes | social_minutes | meditation_minutes | exercise_minutes | outdoor_minutes | day_description | score_reason | submitted_at_local | client_timezone | received_at_script | api_version | user_agent | source
```

## Important note

The Apps Script setup check compares the header row in order, so the new column
must be in that exact position.
