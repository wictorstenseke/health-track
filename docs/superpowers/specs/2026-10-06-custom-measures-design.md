# Own measurement types on Mått

2026-10-06 · design, approved in chat

## Goal

On the Mått tab the user can create their own measurement types (e.g. Bröst) from the `+ Ny mätning` sheet, and delete any type on the tab. The yearly summary under each type's name shows its unit: `−3,5 cm i år`.

Said by the user:

- Free name, always cm ("should work in 99% of cases").
- `+ Ny mätning` stays. It opens the sheet with the value fields, plus a create-new button. Create-new swaps the sheet to a name field with save and cancel. After saving, the new type is in the default list, sorted alphabetically.
- Delete is available for all types.

Assumed (confirmed with the design):

- "All types" means everything on Mått: Midja, Höft and own types. Vikt is fixed; Hem is built on it.
- A type exists as soon as it is named, before it has any value.

## Out of scope

Renaming or reordering types, units other than cm, deleting Vikt, undo for a deleted type, more groups than `Omkrets`.

## Data model

`MetricId` stops being a union and becomes `string`.

- `weight` stays a code constant: kg, valid 20–300, lives on Hem. It is not a row in the table.
- Every other metric is a row in a new table and is measured in cm, valid **1–300** (was 20–300; too high for e.g. a wrist). Step 0.1 as before.

Dexie `vagen`, version 2 (version 1 is left as it is):

| table | key | fields |
|---|---|---|
| `metrics` | `id` | `name`, `createdAt` (epoch ms) |

- Defaults: `{ id: 'waist', name: 'Midja' }` and `{ id: 'hip', name: 'Höft' }`. Seeded by the v2 upgrade (existing installs) and on first creation (new installs). Existing entries are not touched; their `metricId` values already match.
- Own types get `id = newId()`.
- `Radera all data` clears `entries`, `settings` and `metrics`, then puts the two defaults back.

Name rules, checked when creating:

- Trimmed; 1–30 characters; one line.
- Unique among the types, ignoring case.
- Not one of the reserved words, ignoring case: `Vikt`, `weight`, `waist`, `hip` (the first is the fixed metric, the others are CSV keywords).

Deleting a type removes the row and every entry with that `metricId`, in one transaction. No undo.

Labels: `Vikt` stays in `src/i18n/sv.ts`, where the two default names also live for seeding. Everywhere else a type's label is its `name` from the table.

## Mått tab

- Rows come from the table, sorted A–Ö with Swedish collation, ignoring case. A long name truncates rather than pushing the value off the row.
- Summary line under the name: `−3,5 cm i år` (same rule as today: only with two or more entries this year).
- A type with no entries shows `–` as its value and no summary.
- With no types left, the group holds only `+ Ny mätning`.

### The `+ Ny mätning` sheet

Two views in the same sheet:

**Values** (title `Nya mått`, as today)

- One decimal field per type, A–Ö, then `Skapa nytt mått`, the date-time and `Spara`.
- Saving works as today: only filled fields, all with the same `takenAt`.
- The fields scroll inside the sheet when there are many, so `Spara` stays reachable.

**Create** (title `Nytt mått`)

- `Namn` text field (focused), `Avbryt` and `Spara`.
- `Spara` is disabled until the name passes the rules. A taken or reserved name shows `Finns redan` under the field.
- `Spara` creates the type and returns to Values, where it now has a field in its alphabetical place. `Avbryt` returns to Values without creating anything.
- Values typed before opening Create are kept.

With no types, the sheet opens on Create, and `Avbryt` closes it.

## Detail screen

- Title is the type's name. Unit and valid range follow the rule above.
- Not for Vikt: a red `Radera mått` button at the bottom, shown with or without entries. It opens one confirm sheet: `Bröst och dess 14 mätningar raderas. Det går inte att ångra.` (`Bröst raderas.` when it has none), with `Avbryt` and `Radera`. Confirming deletes and goes back to Mått.
- A route to an id that is neither `weight` nor an existing type shows the Mått tab. The route parser accepts any id (`[\w-]+`, since own ids are UUIDs); whether it exists is decided where the types are known, without a navigation side effect.

## CSV

The `metric` column holds a label, not always an id.

**Export**

- `weight`, `waist` and `hip` are written as those words (unchanged, so old and new files look the same for them).
- An own type is written as its name, quoted when it contains `,` or `"`.

**Import**

Parsing stays pure and knows nothing about the stored types: a row is `{ metric: label, takenAt, value }`, valid when the label is 1–30 characters and the value is in range for its kind (weight, or anything else). A headerless file is in the own format when its first row has at least three cells and the second is not a number.

The data layer then resolves each label, in this order, creating types in the same transaction as the entries:

1. `weight` / `vikt` → weight.
2. A type whose id is the label.
3. A type whose name is the label, ignoring case.
4. `waist` / `midja`, `hip` / `höft` → the type named Midja / Höft if there is one, otherwise the default is created again.
5. Anything else → a new type with that name.

So export followed by import on an empty app restores every type and entry, and an old export still imports. Duplicate detection is unchanged and runs on the resolved id.

Legacy per-year sheets are read as today (`Vikt` / `Midja` / `Höft` columns, others ignored); their labels go through the same resolution, so a deleted Midja comes back when a sheet with that column is imported.

The demo data uses `waist` and `hip` and needs no change beyond its transaction including the new table.

## Tests

Vitest with fake-indexeddb, as today.

- Migration: a v1 database with entries opens as v2 with the two defaults and the entries intact.
- New install has the two defaults; clearing all data puts them back.
- Create (name rules: empty, too long, duplicate ignoring case, reserved), delete (removes the type's entries only).
- Sorting: Swedish order (`Å`, `Ä`, `Ö` last), case ignored.
- Valid ranges: 1–300 for a type, 20–300 for weight.
- CSV: export labels and quoting; round trip with own types into an empty app; each resolution step; old export still imports; headerless own format.
- Router: UUID ids parse; unknown id falls back to Mått.

## Docs

`docs/spec.md`: remove custom metrics from the non-goals; update the data model, Mått, detail screen and CSV sections to match this.
