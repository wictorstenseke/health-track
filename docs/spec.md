# Vågen — spec (v1)

Personal weight + body-measurement tracker. Offline-first PWA for iPhone (17 Pro, installed to Home Screen). All data local on device. Swedish UI.

## Goals

- Log weight in seconds: open app → drag dial → Spara.
- See this year's progress vs previous years.
- Track waist + hip separately (Mått tab).
- Data survives: IndexedDB + `navigator.storage.persist()` + CSV export/import.

## Non-goals (v1)

Custom metrics UI, dark mode, server DB/sync, goal weight, English UI, lb units, notifications, install guide, backup nudge banner.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- vite-plugin-pwa (precache all assets, `registerType: 'autoUpdate'`, silent update)
- Dexie (IndexedDB)
- Recharts
- Vitest + fake-indexeddb
- Font: Geist, self-hosted via `@fontsource-variable/geist` (works offline)
- Hash routing (avoids GitHub Pages base-path 404s)

## Hosting

- Public GitHub repo `health-track`, GitHub Pages, deploy via GitHub Actions on push to `main`.
- URL: `https://wictorstenseke.github.io/health-track/` → Vite `base: '/health-track/'`.
- Storage is per-origin: moving domain = empty app (export → import to migrate). Other Pages repos under same user share the origin.
- Anyone can use the app; each person's data lives only on their own device.

## Data model

Metric definitions are code constants in v1 (generic shape so custom metrics can become a DB table later):

```ts
type MetricId = 'weight' | 'waist' | 'hip'
interface MetricDef { id: MetricId; unit: 'kg' | 'cm'; validMin: number; validMax: number }
// all three: valid 20–300 (rejects typos on input/import), step 0.1 everywhere
// labels ('Vikt', 'Midja', 'Höft') live in src/i18n/sv.ts with all other strings
// weight dial range 60–100 is separate: DIAL_MIN/DIAL_MAX in src/lib/dialMath.ts
```

Dexie DB `vagen`, version 1:

| table | key | fields | indexes |
|---|---|---|---|
| `entries` | `id` (uuid) | `metricId`, `value` (number, 1 decimal), `takenAt` (epoch ms), `createdAt`, `updatedAt` | `metricId`, `takenAt`, `[metricId+takenAt]` |
| `settings` | `key` | `value` | — |

Settings keys: `name`, `heightCm`, `lastExportAt`.

Rules:
- Every save = new entry. Multiple per day allowed. No dedup on manual entry.
- Values rounded to 1 decimal on write (`Math.round(v * 10) / 10`).
- Schema changes only via Dexie versioned migrations. Never delete/recreate the DB.
- Call `navigator.storage.persist()` on app start (best effort; covers "before first save").
- IDs via own `newId()` — `crypto.randomUUID` is missing on plain-http origins (phone testing over LAN).
- Height is a profile value (not tracked over time), used for BMI.

## Screens

Bottom tab bar: **Hem · Mått · Inställningar**.

Navigation: hash routes. The three tabs stay mounted, so switching is instant and each tab keeps its state and scroll position. All entries are held in memory from one live query. Detail screens keep the tab bar (parent tab highlighted: weight → Hem, waist/hip → Mått) and a sticky back button. The installed iOS app has no browser back or swipe-back. Back uses `history.back()` only when the app pushed the current entry; otherwise it goes to the parent tab.

### Setup (first launch, when no `name`)

One screen: Namn, Längd (cm), optional "Importera CSV". Button "Kom igång" → Hem. All editable later in Inställningar.

### Hem

Top to bottom:
1. **Gradient hero** (orange → red, like reference image 2), extends under status bar. "Välkommen tillbaka" / name.
2. **Pill**: `Senast 82,4 kg · för 3 dagar sedan`. Empty: `Ingen vägning än`.
3. **Year chart card** (rounded, grouped with hero):
   - Header: current year + change since first weigh-in this year (`−3,1 kg`). Hidden if < 2 entries this year.
   - Current year solid line; previous 2 years as ghost lines (older = fainter), small year labels at line ends.
   - X axis Jan–Dec, full year visible.
   - Tap → weight detail screen.
4. **Weight dial**:
   - Scale-shaped frame (reference image 3), **fixed orange needle, scale slides** under it.
   - Range 60–100 kg (constant). Ticks at 0.5 and 1 kg, labels every 5 kg. ~±4,5 kg visible (tune on device).
   - Drag left/right with momentum (fling capped at ~3 kg travel), snaps to 0.1.
   - Starts at last weight (75,0 if none).
   - Haptic tick per 0.1 via iOS 18+ `<input type="checkbox" switch>` trick — best effort, drop if flaky.
   - `−` / `+` buttons beside number for 0.1 nudges.
   - Big number `82,4 kg`; tap → keypad input (`inputmode="decimal"`).
5. **Date link**: `Idag · ändra` → native date-time picker for backdating. Defaults to now.
6. **Spara** (black pill button). After save: haptic + button shows `Sparat ✓` for 1.5 s; pill + chart update. Date resets to now.

### Detail screen (`/metric/:metricId`) — weight, waist, hip

Same component for all metrics:
- Big chart: all years overlaid on Jan–Dec axis; toggle chips per year.
- Points connected with smooth (monotone) lines. No moving average.
- Per-year stats: första, senaste, lägsta, högsta, förändring (senaste − första).
- Weight only: **BMI** = latest weight / (heightCm/100)², 1 decimal. Hidden if no height.
- **Same date last year** callout: `1 okt 2025: 84,2 kg → nu 82,4 (−1,8)`. Linear interpolation between bracketing points; else nearest point within 14 days; else hidden.
- **Entry list**: all entries, grouped by month, newest first: `ons 30 sep 07:30 · 82,4 kg · −0,3` (time shown since multiple per day are allowed; delta vs previous entry).
- Tap row → **bottom sheet**: value editor (dial for weight, number input for cm), date-time picker, Spara, Radera.
- Delete → entry removed + **Ångra** toast (5 s) that restores it.

### Mått

- Cards: Midja, Höft — latest value, change since first entry this year, current-year sparkline. Tap → detail screen.
- **Mät** button → batch form: one decimal input per metric + date-time (default now). Saves only filled fields, all with same `takenAt`.

### Inställningar

- Namn, Längd (cm)
- Importera CSV
- Exportera CSV + quiet text `Senaste export: för 23 dagar sedan`
- Radera all data (two confirms)
- App version

## CSV

### Export

Opens iOS share sheet (`navigator.share` with file; fallback download). Filename `vagen-YYYY-MM-DD.csv`. Updates `lastExportAt`.

```
takenAt,metric,value
2026-10-01T07:32,weight,82.4
2026-09-28T07:10,waist,92.5
```

- `takenAt`: local time ISO without offset. `,` delimiter, `.` decimal.
- Name/height not included.

### Import

Multi-file select. Auto-detects:
- Delimiter `,` or `;`; decimal `.` or `,`.
- **Own format**: `takenAt,metric,value`.
- **Legacy per-year sheets** (Numbers export, e.g. `2024-År 2024 tracking.csv`): date in column 1; header `Vikt`/`Midja`/`Höft` → weight/waist/hip, other columns ignored. No recognised header → weight in column 2. Dates `YYYY-MM-DD` or `D/M` with the year taken from the file name. Values may carry `kg`/`cm`. Waist/hip values repeated from the row above are carried forward, not new measurements → skipped. Date-only rows get `takenAt` 12:00 local (avoids day shift).

Flow: parse → preview (`Hittade 143 rader (3 jan 2024 – 28 dec 2024), 2 ogiltiga`) → Importera. Rows identical to an existing entry (same metric + takenAt + value) are skipped, so re-import is idempotent. Invalid rows listed, not imported.

## Look

- Light only. Reference image 2: orange→red gradient hero, white/soft-grey cards, large radii, soft shadows, black pill buttons. Dial styled after reference image 3, recoloured to app palette.
- iOS: `viewport-fit=cover`, safe-area insets, `apple-mobile-web-app-status-bar-style: black-translucent`, `overscroll-behavior: none`.
- Locale: Swedish. `82,4 kg`, `1 okt 2026`, 24 h, week starts Monday. `Intl` with `sv-SE`. All strings in `src/i18n/sv.ts`.

## PWA

- Manifest: name/short_name `Vågen`, `display: standalone`, theme/background colours from palette.
- Icon: orange→red gradient square with white dial/needle glyph. SVG source → PNG 180 (apple-touch), 192, 512, maskable 512.
- Precache app shell + fonts. Silent auto-update; IndexedDB untouched by updates.

## Testing

Vitest:
- CSV parse (own + legacy, `,`/`;`, `.`/`,` decimals, invalid rows, idempotent re-import) and export round-trip.
- Year stats, same-date-last-year interpolation, BMI, deltas.
- Data layer with fake-indexeddb: add, edit, delete + undo, settings, import dedup. Migration tests arrive with the first schema v2.

No E2E. Dial + visuals checked by hand on iPhone via local network dev URL.

## Open items

- Dial tick spacing / sensitivity / fling — tune on device.
- iOS haptic trick during drag (may only fire on taps) — verify on device.

Resolved: font = Geist (self-hosted). Plan: `docs/superpowers/plans/2026-10-01-vagen-v1.md`.
