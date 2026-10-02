# Veyin — spec (v1)

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

Dexie DB `vagen` (the app's first name, Vågen; kept so stored data survives the rename), version 1:

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

Bottom tab bar: **Hem · Mått · Inställningar**, a floating glass capsule (Instagram-style): fully rounded, 240 px wide at most and centred, translucent white with blur. Icons only (names via `aria-label`); a grey pill slides under the active tab (slight spring) and its icon pops. An 8 px ember dot sits on the Inställningar icon while a new build is waiting. Its position lives in CSS variables (`--tab-bar-*`) so toasts can sit above it.

Navigation: hash routes. The three tabs stay mounted, so switching is instant and each tab keeps its state and scroll position. All entries are held in memory from one live query. Detail screens keep the tab bar (parent tab highlighted: weight → Hem, waist/hip → Mått) and a sticky back button. The installed iOS app has no browser back or swipe-back. Back uses `history.back()` only when the app pushed the current entry; otherwise it goes to the parent tab. Tabs are buttons that replace the current history entry (like a native tab bar). No route changes go through followed links, because iOS Home Screen apps can turn a followed link into a page load.

### Setup (first launch, when no `name`)

One screen: Namn, Längd (cm), optional "Importera CSV". Button "Kom igång" → Hem. All editable later in Inställningar.

### Hem

Top to bottom:
1. **Header card** (like reference image 2): a rounded card inset from the screen edges, just below the status bar, filled with a vivid blurred colour image (`src/assets/hero.jpg` via `.hero-gradient`, zoomed in on its orange middle; ember orange while it loads). Setup's title card uses the same. "Välkommen tillbaka" / name.
2. **Year chart card** (white, nested in the header card with an 8 px gradient border):
   - Header: current year + change since first weigh-in this year (`−3,1 kg`). Hidden if < 2 entries this year.
   - Current year solid line; previous 2 years as ghost lines (older = fainter), small year labels at line ends.
   - X axis Jan–Dec, full year visible.
   - Tap → weight detail screen.
3. **Weight entry** (16 px below the header card): one band (the dial's rim + white inside; 20 px padding top and bottom) holding, top to bottom: the number `82,4 kg` (tap → keypad input, `inputmode="decimal"`; the picked date and time under it only while backdated), 16 px to the scale (no band of its own, tick labels every 5 kg; it shows ~±5,2 kg so the ticks run out to just inside the band's edges), 20 px to the buttons (see 4). Hem fits an iPhone 17 Pro screen without scrolling.
   Scale details:
   - Straight pill-shaped band with rounded ends (reference image 3's frame, unbent), **fixed orange needle, scale slides** under it. Ticks fade out towards the ends.
   - Range 60–100 kg (constant). Ticks at 0.5 and 1 kg, labels every 5 kg. ~±4,5 kg visible (tune on device).
   - Drag left/right with momentum (fling capped at ~3 kg travel), snaps to 0.1.
   - Starts at last weight (75,0 if none).
   - Haptic tick per 0.1, best effort: Vibration API on Android; on iOS the `<input type="checkbox" switch>` trick, which only fires from code on iOS 17.4–26.4 (26.5 blocked it).
4. **Buttons** under the scale, both 40 px: a round calendar icon button on the left, 20 px in (opens the native date-time picker for backdating; defaults to now; tinted orange while backdated), and the **Spara** pill centred in the band. Hem keeps one weight per day: saving on a day that already has a weight replaces that day's newest one (detail screens can still hold several, e.g. imported). The button reads `Sparat ✓` (orange, disabled) while the selected day's weight equals the scale; moving the scale switches it back to `Spara`. After save: haptic (the tap toggles a hidden `<input switch>` under a transparent label, the only web haptic iOS 26.5+ still allows), `Sparat ✓` for at least 1.5 s, chart updates, date resets to now. The number flies to the chart: a copy arcs from the scale onto the saved point (0.75 s, shrinking to label size and turning orange) while the number dips out and back, then the point pops with a ring and fades. Only for years the card shows; none with reduced motion.

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

- Grouped list like Inställningar, group `Omkrets`: one row per metric (Midja, Höft) — name and change since first entry this year left; current-year sparkline, latest value and chevron right. Tap → detail screen.
- Last row **+ Ny mätning** (ember) → batch form: one decimal input per metric + date-time (default now). Saves only filled fields, all with same `takenAt`.

### Inställningar

iOS-style grouped list: a quiet group label over one card, rows split by hairlines, label left and value or control right.

- **Profil**: Namn, Längd (editable in place, value right-aligned, `cm` after it)
- **Utseende**: `Mörkt läge` switch (iOS-style, ember when on, haptic tap). Off by default; doesn't follow the phone's setting.
- **Data**: Importera CSV (row with chevron; the preview opens inside the card) · Exportera CSV with quiet text `Senaste export för 23 dagar sedan` under it
- **Om appen**: Version · Sök efter uppdatering (status right; `Ny version finns` + ember `Uppdatera` when a build is waiting)
- Radera all data: solid red button at the bottom → action sheet with two confirms

## CSV

### Export

Opens iOS share sheet (`navigator.share` with file; fallback download). Filename `veyin-YYYY-MM-DD.csv`. Updates `lastExportAt`.

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

- Light by default, dark as a setting (soft charcoal: page #1d1b1a, cards #1e1e21, text #f2f2f4; ember unchanged; the hero image stays). Both themes paint the page with a warm sheen on a fixed layer behind the screens, glowing ember from the bottom right: the app icon's near-black gradient in dark, a toned-down version over the canvas grey in light. Colours are theme tokens in `index.css` (`canvas`, `surface`, `ink`, `on-ink`, `muted`, `faint`, `fill`, `line`, `raised`, `rim-*`) switched by `<html data-theme="dark">`; SVG colours the theme can't reach through CSS come from `useDark()`. The choice lives in localStorage (`vagen-theme`) so an inline script in `index.html` applies it before the first paint, and `theme-color` follows the page colour. Reference image 2: orange→red gradient hero, white/soft-grey cards, large radii, soft shadows, black pill buttons. Dial styled after reference image 3, recoloured to app palette.
- iOS: `viewport-fit=cover`, safe-area insets, `overscroll-behavior: none`. Status bar `apple-mobile-web-app-status-bar-style: default` with `theme-color` canvas grey: on iOS 26 Home Screen apps, `black-translucent` makes the web view one status-bar height too short (gap under the tab bar, WebKit bug 301108), and iOS tints a see-through bar from the page. The status-bar style is read at install time, so changing it needs a reinstall. iOS 26 also blurs and fades ~30 pt below the status bar over whatever sits there (measured on device, can't be turned off), so every screen starts its content at `--screen-top` (safe area + 2.25rem).
- Type scale (Tailwind sizes only, no one-off px): 36 `4xl` display (the weight number) · 30 `3xl` screen titles (name on Hem, Mått, Inställningar, detail, setup) · 24 `2xl` card values · 18 `lg` card/section/sheet titles, primary buttons and the `kg` after the weight number · 16 `base` body, inputs, secondary buttons · 14 `sm` labels, date link, month headers, chips, the detail table · 12 `xs` captions (version, import details). Semibold for 18 and up; medium for labels; `tracking-tight` for 24 and up.
- Layout: content and cards sit 16 px from the screen edges, header card included. Hem's header card: the left-aligned welcome line and name (tight, no gap) sit centred between the card's top and the nested chart card (64 px each side); the text starts where the chart card's "2026" does.
- Locale: Swedish. `82,4 kg`, `1 okt 2026`, 24 h, week starts Monday. `Intl` with `sv-SE`. All strings in `src/i18n/sv.ts`.

## PWA

- Manifest: name/short_name `Veyin`, `display: standalone`, theme/background colours from palette.
- Icon: white 3D V (`scripts/icon-logo.png`) on a near-black gradient with an ember glow from the bottom right. `npm run icons` (`scripts/generate-icons.mjs`) draws PNG 64, 180 (apple-touch), 192, 512, maskable 512 (smaller logo) and a rounded-square favicon.ico (16/32/48).
- Precache app shell + fonts. The app checks for a new build on launch and on returning to the foreground; installing it is a tap in Inställningar (`Uppdatera`), never an automatic reload. IndexedDB untouched by updates.

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
