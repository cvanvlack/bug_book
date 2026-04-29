# Add `outdoor_minutes`

This repo already treats each tracked activity as the same concept in four
places:

1. form field in `index.html`
2. payload + validation in `app.js`
3. sheet schema + validation in `apps-script/Code.gs`
4. documentation/schema notes in `README.md`

Because you do **not** need backward compatibility, the cleanest change is to
add a new required field named `outdoor_minutes` everywhere and then manually
update the Google Sheet header row to match.

## Recommended shape

- UI label: `Outdoor minutes`
- HTML field name: `outdoorMinutes`
- JS payload key: `outdoorMinutes`
- sheet column name: `outdoor_minutes`
- type: required integer minutes
- step: `15` minutes
- range: `0` to `1440`

That gives you the same 15-minute granularity as `creative_minutes` and
`social_minutes`, but allows a full day outdoors.

## File-by-file changes

### 1. `index.html`

Add a new `<select>` in the existing activity grid near the other minute-based
fields.

Use the same pattern as the current selects:

- `id="outdoor-minutes"`
- `name="outdoorMinutes"`
- `required`
- placeholder option text: `Select outdoor minutes`
- label text: `Outdoor minutes`

Recommended placement:

- after `Exercise minutes`
- before `Brief description`

## 2. `app.js`

### Add a DOM reference

Near the other inputs, add:

- `var outdoorMinutesInput = document.getElementById("outdoor-minutes");`

### Populate the select

Inside `init()`, add a `populateMinuteSelect(...)` call for the new field:

- placeholder: `Select outdoor minutes`
- step: `15`
- max: `24 * 60`

Example intent:

- `populateMinuteSelect(outdoorMinutesInput, "Select outdoor minutes", 15, 24 * 60);`

### Include it in the payload

Inside `buildPayload(formData)`:

1. parse the new value
2. include `outdoorMinutes` in the returned payload object

Use the same pattern as the other minute fields:

- `var outdoorMinutes = parseMinutes(getFormValue(formData, "outdoorMinutes"));`
- `outdoorMinutes: outdoorMinutes`

### Validate it

Inside `validatePayload(payload)`, add a new check:

- must be an integer
- must be `>= 0`
- must be `<= 1440`
- must be divisible by `15`

Suggested message:

- `Outdoor minutes must be between 0 and 1440 in 15-minute increments.`

## 3. `apps-script/Code.gs`

### Update the schema/header list

Add `outdoor_minutes` to `BUG_BOOK_HEADERS`.

Recommended position:

- after `exercise_minutes`
- before `day_description`

Resulting order:

```text
entry_date
score
creative_minutes
social_minutes
meditation_minutes
exercise_minutes
outdoor_minutes
day_description
score_reason
submitted_at_local
client_timezone
received_at_script
api_version
user_agent
source
```

### Parse and validate the incoming value

Inside `validateEntry_(payload)`:

1. read the incoming value with `numberFromPayload_(payload, "outdoorMinutes")`
2. validate it as a whole number from `0` to `24 * 60`
3. require `outdoorMinutes % 15 === 0`
4. include it in the returned `entry` object

Suggested validation message:

- `Outdoor minutes must be between 0 and 1440 in 15-minute increments.`

### Append it to saved rows

Inside `buildRow_(entry)`, insert `entry.outdoorMinutes` in the same position as
the header:

- after `entry.exerciseMinutes`
- before `entry.dayDescription`

## 4. Google Sheet

Because backward compatibility is not required, manually update the sheet header
row so it exactly matches the new schema.

If your sheet already has data, the least confusing path is:

1. insert a new column for `outdoor_minutes`
2. place it after `exercise_minutes`
3. rename the header cell to `outdoor_minutes`
4. manually fill older rows however you want

Important: the Apps Script schema check requires the header row to match the
expected order exactly.

## 5. `README.md`

Update the docs so the repo matches the code:

- add `outdoor_minutes` to the Google Sheet schema list
- add `outdoorMinutes` to the example JSON request body
- update any acceptance or validation notes that describe the tracked minute
  fields

## Optional cleanup

If you want the written spec to stay current too, also update `design.md`:

- add `outdoor_minutes` to the data model
- add `Outdoor minutes` to the UI field list
- describe it as `0` to `1440` in `15` minute increments

## Minimal implementation checklist

- [ ] Add the new select to `index.html`
- [ ] Add the new input reference in `app.js`
- [ ] Populate the select in `init()`
- [ ] Add `outdoorMinutes` to the submit payload
- [ ] Add frontend validation in `app.js`
- [ ] Add `outdoor_minutes` to `BUG_BOOK_HEADERS`
- [ ] Add backend parsing + validation in `validateEntry_()`
- [ ] Add `entry.outdoorMinutes` to `buildRow_()`
- [ ] Manually update the Google Sheet header row
- [ ] Update `README.md`

## Notes

- No migration code is needed.
- No compatibility layer is needed for old header layouts.
- No settings-page change is needed; setup verification will follow the new
  backend header list automatically once `BUG_BOOK_HEADERS` is updated.
