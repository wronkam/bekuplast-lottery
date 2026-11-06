# AGENTS.md: guide for AI agents and developers

This is the technical handbook for **bekuplast-lottery**. Read it before changing code or adding a theme. User-facing usage is in `README.md`.

- **Live site:** https://wronkam.github.io/bekuplast-lottery/. Every push to `main` deploys it via GitHub Pages.
- **What it is:** a static, single-page prize lottery for a few hundred names and 3–12 prizes, shown on a projector. A wheel spins, the winner's name flies under the prize, winners leave the pool, and a summary appears at the end.
- **Verify every change with** `node tests/smoke.js`. See [Testing](#testing).

---

## 1. Ground rules (do not break these)

1. **No build step and no npm dependencies at runtime.** Use plain `<script>` files, not ES modules, so `index.html` also works when opened from disk (`file://`). Don't introduce bundlers, frameworks or `import`/`export` in `js/`.
2. **No external requests.** Everything is local, including the brand font (`fonts/brand-font.woff2`), so the app works offline at a venue with no Wi-Fi. Don't add CDN scripts or web-font `@import`s to the built-in themes.
3. **Randomness stays fair.** Winners come from `L.fx.randomInt` (crypto with rejection sampling). The animation is aimed at the pre-chosen winner, never the other way round.
4. **The result is committed before the animation** (`spin()` in `js/app.js`). A reload mid-spin must not re-roll. Keep it that way.
5. **Every UI string goes through i18n** (`js/i18n.js`), and every language must have the same keys. The smoke test checks this.
6. **Every theme follows the theme standard** (section 8): one folder, a full variable list, plain selectors.
7. **Names are UTF-8 with Polish and other non-ASCII characters.** Never strip or normalize them. Use `textContent`, not `innerHTML`, for user data.

---

## 2. Repository map

```
index.html                 page skeleton + inline <head> script that picks and loads the theme before first paint
css/styles.css             BASE layout & components, all inside `@layer base { … }`, driven by CSS variables
themes/<name>/theme.css    one theme per folder (+ its assets). Only the active one is loaded
themes/_template/          documented starting point for new themes (not registered as a theme)
js/config.js               window.LOTTERY_CONFIG: all settings, theme registry, lotteryThemeHref()
js/i18n.js                 window.LOTTERY_I18N: en/pl/de dictionaries + L.i18n helper
js/csv.js                  L.csv: UTF-8 decoding, CSV parser, names/prizes loaders, CSV export
js/storage.js              L.store: localStorage (progress, prefs) + IndexedDB (uploaded files)
js/effects.js              L.fx: RNG, shuffle, sound, confetti, flyText; L.theme: reads CSS variables for the canvas
js/wheel.js                L.Wheel class + RENDERERS (drum, pie); L.wheelStyles
js/app.js                  the app: data loading, state machine, rendering, dialogs, theme/language switching
data/names.csv, prizes.csv demo data (300 names; 8 prizes with Polish name + German secondary_name)
images/prizes/*.svg        demo prize images
images/start.svg           default start-screen image (themes can override; Christmas has its own)
fonts/brand-font.woff2     bundled brand font (Manrope, OFL); "Brand Font" in CSS; drop-in replaceable (fonts/README.md)
tests/smoke.js             end-to-end smoke test (Playwright); not deployed
.github/workflows/pages.yml  deploys: copies index.html css js data images themes fonts → Pages
README.md                  user docs (usage, CSV formats, config, themes)
```

**Script load order** (`index.html`): `config.js` loads in `<head>`. The rest load at the end of `<body>`: `i18n.js → csv.js → storage.js → effects.js → wheel.js → app.js`. Each file is an IIFE that extends the global namespace `window.Lottery` (called `L` in the code). `app.js` runs `init()` last.

**Globals:** `window.LOTTERY_CONFIG`, `window.LOTTERY_I18N`, `window.lotteryThemeHref(name)`, `window.Lottery` (`L`).

---

## 3. Runtime flow

### Boot
1. **Inline `<head>` script** picks the theme with priority `?theme=` → saved `prefs.theme` → `config.theme`. It sets `<html data-theme>` and `document.write`s `<link id="theme-css" href="themes/<name>/theme.css">`, which blocks rendering so there is no flash of the wrong theme.
2. **`app.js init()`:**
   - `applyLanguage()` picks the language: `?lang=` → `prefs.lang` → `config.language`.
   - `applyTheme()` sets the logo and calls `L.theme.read()`.
   - It creates `new L.Wheel(canvas)`, then `bindEvents()`.
   - `loadData()` loads the data. On failure it shows an error and opens Settings for upload; opening from `file://` always fails here.
   - `restoreOrCreateState()`, then `prepareWheel()`, then `render(true)`.

### Data (`loadData`)
- **Source:** if the user uploaded files (IndexedDB key `upload`), use them. Otherwise fetch `config.data.namesUrl` / `prizesUrl`.
- **`data` object:** `{ names: string[], prizes: Prize[], byId, key, source: 'demo'|'upload', warnings[], namesText, prizesText, images: File[] }`.
- **`Prize`:** `{ id: 'p<index>', rank: number, name, secondary, image, imageUrl }`. Prizes are sorted by `rank`; 1 is the best.
- **`secondary`:** the prize name in a second language, from the `secondary_name` column (older `description` columns map here too). It's shown in `#prize-desc` under the name and as `.s-secondary` on the summary. The typical use is a Polish name with the German translation.
- **`imageUrl`:** if the basename of the `image` column matches an uploaded file, it's that file's object URL. Otherwise it's the path as written, relative to `index.html`. A missing or broken image shows the 🎁 placeholder (`.no-image`).
- **`data.key`:** a hash of names and prizes. Saved progress is only restored if the key matches, so new data means a fresh lottery.

### State (persisted in localStorage `<storageKey>:state`)
```js
state = { key, order: [prizeId…], current: <index into order, or -1 = start screen>, results: { [prizeId]: { nameIndex, name } }, showSummary }
```
- **`order`:** prizes sorted by rank, ascending for `drawOrder: 'asc'` or descending for `'desc'`. Changing the order mid-lottery resets, after a confirmation.
- **`results[prizeId] = { nameIndex: null, name: null }`:** the prize had no eligible participants left.
- **People are tracked by index into `data.names`,** so duplicate names count as separate people.
- **`eligible()`:** every name index that is not already in `results`.

### Main button (`mainAction`): the state machine
| Situation | Press does | Button text (i18n key) |
| --- | --- | --- |
| start screen (`current === -1`, `body.intro`) | `current++` to the first prize, exactly like "next prize" | `begin` |
| current prize not drawn | `spin()` | `spin` |
| spinning | (ignored, `busy`) | `spinning` |
| drawn, not last | `current++`, `prepareWheel()`, `render(true)`; also `spin()` if `config.spinOnNext` (default **false**: two presses per prize) | `next` |
| drawn, last | `openSummary()` | `showSummary` |

**`spin()` sequence:**
1. Pick `pos = randomInt(wheelPool.length)`.
2. Commit `results` and save.
3. `spinningPrizeId` hides the result from the UI while the wheel turns.
4. `await wheel.spinTo(pos)`.
5. Fanfare, confetti, then `L.fx.flyText(name → #winner-name)`, then `render()` with the "pop" animation.

**Start screen:** it exists only if a start image is configured (`startImageUrl()`: the theme's `startImage`, else `config.startImage`; `null` turns it off). `createState()` then sets `current = -1`. `render()` shows the start image, the `introTitle` and the `introHint`, and CSS hides the winner box (`body.intro`). Reset and draw-order changes return to the start screen. `currentPrize()` is `null` there, so guard any new code that uses it with `inIntro()`.

**`prepareWheel()`** shuffles the eligible pool onto the wheel. After a reload on an already-drawn prize, it puts the winner back under the pointer.

**Keyboard** (handler in `bindEvents`; ignored while a dialog is open or an input or select has focus):

| Key | Action |
| --- | --- |
| Space / Enter / → / PageDown | Main button |
| F | Fullscreen |
| M | Sound |
| H | Hide / show the top bar |
| L | Next language |
| Esc | Close summary |

### Other UI pieces in `app.js`
- **`render()`:** redraws the prize card, winner slot, prize list, pool info and button text. Call it after any state change.
- **`openSummary(quiet)` / `closeSummary()` / `exportCsv()`:** the CSV export uses the i18n `csvHeader` and `csvFileName` and the `config.csv.exportDelimiter`, with a BOM.
- **`confirmDialog(text, okLabel)`:** a promise that resolves to `true` or `false`. Use it for anything destructive (reset, new data, order change).
- **`fillSettings()` / `openSettings()` / `loadFiles()` / `restoreDemo()`:** the settings dialog. Loading files validates by parsing, stores the files in IndexedDB, clears the saved progress, then reloads the page.
- **`applyTheme(name)`:**
  - Sets `data-theme` and the logo (theme `logoUrl`, falling back to `config.logoUrl`).
  - Swaps the `<link id="theme-css">`: it inserts the new link, and once that loads it removes the old one and calls `L.theme.read()` and `fitToolbar()`.
- **`applyLanguage(code)`:**
  - Calls `L.i18n.set` and then `applyStatic()`, which fills `data-i18n` and `data-i18n-title`.
  - Rebuilds the language switch, the wheel-style and theme options, and calls `fitToolbar()`.
  - Re-renders the stage, the summary and the open Settings dialog.
- **`applyLayoutPrefs()` / `toggleTopbar()`:**
  - `prefs.showList` controls `body.hide-list`. The prize list is hidden by default (`config.showPrizeList: false`); with the list hidden, the stage uses two columns on screens wider than 1100 px. The switch is `#opt-list` in Settings.
  - `prefs.topbarHidden` controls `body.topbar-hidden`. The top bar is hidden and only `#btn-show-topbar` (a faint ▾ in the corner) remains. The ▴ button `#btn-hide-topbar` and the H key toggle it.
- **`fitToolbar()`:**
  - Measures the toolbar with the Style drop-down visible.
  - If it doesn't fit next to the title (with ~170 px reserved for the title, plus the logo), it adds `body.compact-toolbar`. CSS then hides `#theme-select` and shows the `#opt-theme` row in Settings.
  - It runs on topbar resize, language or theme change, logo load and font load.

### Persistence & URL parameters
| Where | Key | Content |
| --- | --- | --- |
| localStorage | `<storageKey>:state` | lottery progress (above) |
| localStorage | `<storageKey>:prefs` | `{ style, sound, drawOrder, lang, theme, showList, topbarHidden }` |
| IndexedDB db `<storageKey>`, store `kv` | `upload` | `{ namesText, prizesText, images: File[], warnings[] }` |
| URL | `?theme=<name>&lang=<code>` | overrides prefs for this visit (removed from the URL when the user switches) |

`storageKey` is set in `config.js` (`bekuplast-lottery`). Change it to run a separate lottery with no shared saved data.

### Body / html attributes that CSS can use
`html[data-theme="<name>"]`, `html[lang]`, `body[data-wheel="drum"|"pie"]`, `body.is-spinning` (toolbar disabled), `body.compact-toolbar`, `body.load-failed`, `body.intro` (start screen), `body.hide-list` (prize list off), `body.topbar-hidden`.

---

## 4. The wheel (`js/wheel.js`)

- **Model:** position `p` is measured in *items*, and the item under the pointer is `round(p) mod N`. Renderers only draw `this.items` at `this.p`.
- **`spinTo(target)`:**
  - Computes the end position ≥ `minTravel`: for `pie` that's `pieLaps × N`; for `drum` it's `max(minTravelItems, N)`.
  - Optional wind-up (`windUpMs`), then easing `1-(1-k)^easingPower`.
  - Duration is `durationMs ± durationJitterMs`, clamped to at least 500 ms.
  - Resolves when the wheel stops.
- **Idle:** it drifts at `idleSpeed` until `highlight` is set (after a draw).
- **`onIndexChange(index, spinning)`:** a callback, used for tick sounds and the pie readout.
- **Renderers:** `RENDERERS.drum` (a vertical 3D reel; readable with hundreds of names) and `RENDERERS.pie` (a classic wheel, with labels only when slices are wide enough; `#readout` shows the current name).
- **To add a wheel style:** add a function to `RENDERERS(ctx, w, h, th)`. It's listed automatically in Settings. Add the i18n key `style_<name>` to every language.
- **Colours come only from `L.theme`** (`js/effects.js`), which reads CSS variables. It's re-read whenever the theme changes. Never hard-code colours in the wheel.

---

## 5. CSV (`js/csv.js`)

- **Decoding:** bytes are decoded as UTF-8 (BOM stripped). If the result contains U+FFFD, the file is re-decoded as **windows-1250** (the Excel Polish default) and a warning is shown.
- **Parser:** RFC-4180 style (quotes, `""` escapes, CRLF). The delimiter is auto-detected from the first line among `, ; \t |`. Rows are trimmed and empty rows dropped.
- **Names:**
  - A header is recognised if any cell matches `config.csv.nameHeaderKeywords` (EN/PL/DE).
  - With a header, only the matching columns are joined with spaces, so an email column is ignored. Without one, all columns are joined.
  - Duplicate names are kept, with a warning.
- **Prizes:**
  - Columns are found by the aliases in `config.csv.prizeColumns` (`rank`, `name`, `image`, `secondary`; EN/PL/DE). `secondary` accepts `secondary_name`, `translation`, `name_de`, `tłumaczenie`, `übersetzung` and, for older files, `description` or `opis`.
  - With no recognised header, the column order is rank, name, image, secondary.
  - An invalid rank gets the row index, with a warning.
- **Error messages** come from i18n, via `L.i18n.t`.

---

## 6. Effects (`js/effects.js`)

- **`L.fx.randomInt(n)`:** crypto, with no modulo bias. **`L.fx.shuffle`:** Fisher–Yates using `randomInt`.
- **`L.fx.sound`:** WebAudio with no audio files. `tick()` is throttled to 35 ms and `fanfare()` plays on a win. Created on first user gesture.
- **`L.fx.confetti`:** a full-screen canvas (`#confetti`, z-index 60). Colours come from the theme `--palette`.
- **`L.fx.flyText(text, fromRect, toEl, ms)`:** a `.flying-name` element animated along an arc with the Web Animations API.
- **`L.theme.read()`:** reads the `--palette`, `--text`, `--accent`, `--font` and `--wheel-*` variables, with safe fallbacks so a broken theme can't crash the canvas.

---

## 7. Internationalisation (`js/i18n.js`)

- **Structure:** `window.LOTTERY_I18N = { en: {…}, pl: {…}, de: {…} }`. Values are strings, functions (for texts with numbers, e.g. `rank(n)`, `pool(eligible, total)`, `dataStatus(…)`) or arrays (`csvHeader`).
- **In JS:** `T.key` (a Proxy that reads the current language with English fallback) or `t('key', ...args)`. `T.rank(3)` returns `3rd prize`, `3. nagroda` or `3. Preis`.
- **In HTML:**
  - `data-i18n="key"` sets the text.
  - `data-i18n-title="key"` sets the tooltip and aria-label.
  - Both are filled by `L.i18n.applyStatic()`.
- **Adding a text:** add the key to **every** language block, use it, and run the smoke test. It fails on missing keys.
- **Adding a language:** copy the `en` block under a new code and translate `languageName` and everything else. The EN | PL | DE switch picks it up automatically. Optionally add header aliases in `config.csv` and theme labels in `config.themes[*].label`.
- **Polish and German wording:** gender-neutral where it was easy, e.g. "Wylosowano" / "Gezogen" instead of "winner". German uses "Teilnehmende".
- **Data stays as written:** prize names and their second-language names come from the CSV and are never translated by the app.

---

## 8. Themes: the standard

### How themes work
- **Base styles:** `css/styles.css` holds every layout and component rule inside **`@layer base`**. A theme file is **unlayered**, so any rule in it beats the base regardless of specificity. Themes use plain selectors: no `[data-theme]` prefix and no `!important`.
- **One theme at a time:** only the active theme's stylesheet is loaded. Switching swaps the `<link id="theme-css">` live, without a reload.
- **Path:** `themes/<name>/theme.css` by default, or `config.themes[name].css` if set (`lotteryThemeHref`).
- **Canvas colours:** the wheel and confetti read the same CSS variables.
- **Brand font:**
  - `@font-face { font-family: "Brand Font" }` sits at the top of `css/styles.css`, outside the layer.
  - It loads `fonts/brand-font.woff2`, falling back to `.ttf` and then `.otf`. It declares weights 100–900; the bundled file is variable Manrope 200–800.
  - **Drop-in replacement** means replacing that file under the same name, or deleting it and adding a `.ttf`/`.otf`. The smoke test checks that the font loads, and this TTF fallback was verified by hand.
  - The canvas uses `--font` too. The DOM loads the font, and the canvas picks it up on its next frame.

### File structure (keep this order)
```css
/* header comment: theme name + one-line description + "Structure: see themes/_template/theme.css" */
/* ---------- 1. Fonts ---------- */      optional: use "Brand Font" or a local @font-face (url relative to theme.css)
/* ---------- 2. Variables ---------- */  :root { …ALL variables below… }
/* ---------- 3. Component overrides ---------- */  optional plain-selector rules
```

### Variable contract (define all of them; `themes/_template/theme.css` documents each one)
| Group | Variables |
| --- | --- |
| Page & surfaces | `--page-bg` (any background, gradients OK), `--surface`, `--border`, `--text`, `--muted`, `--topbar-bg`, `--topbar-border`, `--badge-bg`, `--dialog-bg`, `--backdrop` |
| Accent | `--accent`, `--accent-strong` (accent for text), `--accent-contrast` (text on accent), `--accent-soft`, `--danger`, `--danger-contrast` |
| Type & shape | `--font`, `--heading-tracking`, `--radius`, `--btn-radius` (999px = pill) |
| Spin button | `--main-btn-bg`, `--main-btn-bg-hover`, `--main-btn-color`, `--main-btn-shadow` |
| Wheel canvas | `--wheel-bg`, `--wheel-bg-2` (drum edges/centre), `--wheel-shade`, `--wheel-radius` (a **number**, px), `--wheel-rim`, `--wheel-hub`, `--palette` (comma-separated colours; slices and confetti) |
| Pie with many names | `--wheel-many: sweep \| blocks`, `--wheel-blocks`, `--wheel-hue-start`, `--wheel-hue-span`, `--wheel-hue-mirror` (0/1), `--wheel-sat`, `--wheel-light`, `--wheel-light-alt` |
| Native controls | `color-scheme: light \| dark` |

### Useful component hooks for section 3
`.topbar` (`::after` is free, e.g. for a stripe), `.brand h1`, `.logo`, `.panel`, `.tag` (`::after` = decoration such as the bekuplast dot or ❄), `.prize-card`, `.prize-image` (keep `::after` free: the 🎁 placeholder uses it), `.prize-name`, `.winner-slot(.has-winner/.no-winner)`, `.winner-label`, `.winner-name`, `.wheel-wrap`, `body[data-wheel="drum"] .wheel-wrap`, `.readout`, `.pool-info`, `.results-list li(.current/.done/.upcoming)`, `.badge`, `.r-winner`, `.btn`, `.btn-main`, `.btn-ghost`, `.btn-danger`, `.icon-btn`, `.toolbar-select`, `.lang-switch span(.active)`, `.summary h2`, `.summary-card` (every card gets the accent border; `.first` = grand prize, extra glow only), `.s-img`, `.s-rank`, `.s-prize`, `.s-secondary`, `.s-winner`, `.topbar-reveal`, `.summary-logo`, `.flying-name`, `.dialog`, `.dialog legend`. `body::before`/`::after` are free for page effects (the Christmas theme puts snow there, at z-index 45 with `pointer-events: none`).

### Adding a theme: checklist
1. `cp -r themes/_template themes/<name>`. Edit the header and all variables, and add assets (logo etc.) to the folder.
2. Register it in `js/config.js → themes` (the order there is the drop-down order):
   ```js
   '<name>': { label: { en: 'My theme', pl: 'Mój motyw', de: 'Mein Thema' }, logoUrl: 'themes/<name>/logo.png' },
   ```
   `label` can be a plain string. `logoUrl` is optional; `null` means no logo. You can point to another theme's asset, as `bekuplast-christmas` does with `themes/bekuplast/logo.png`. Add `startImage: 'themes/<name>/start.svg'` for a themed start screen (400×300 artwork without text works best, since the title is translated).
3. Run `node tests/smoke.js`. It loads every registered theme, checks the top bar at 390, 1024, 1366 and 1920 px in every language, and checks for JavaScript errors.
4. Look at it with `?theme=<name>`. Check the drum and the pie (⚙ → Wheel style), the summary (finish a draw), the settings dialog, and a phone width.
5. Optionally mention it in the README's theme table.

### Theme gotchas (learned the hard way)
- **`.btn:hover` also matches the Spin button.** Theme rules beat the base, so a generic `.btn:hover { background: … }` recolours the Spin button on hover. Always add `.btn-main:hover { background: var(--main-btn-bg-hover); color: …; }`.
- **Transparent ghost buttons can vanish.** On dark pages the summary's "Back to stage" (`.btn-ghost`) is transparent, so give it a background (`.btn-ghost { background: var(--surface); }`).
- **Translucent surfaces make option lists unreadable.** Open `<option>` lists use `--dialog-bg`, so keep `--dialog-bg` solid.
- **The bekuplast logo is for light backgrounds.** It's a transparent PNG cut from a screenshot. On dark themes, put it on a light plaque (see `.logo` in `bekuplast-christmas`).
- **Decorations near the image look random.** The image area is usually larger than the picture, so anything positioned on its corner floats in empty space. The bekuplast corner block was removed for this reason.
- **`--wheel-radius` must be a plain number** (no `px`). The canvas parses it.
- **Keep the top bar narrow.** Long labels or wide buttons force the Style drop-down into Settings (`compact-toolbar`), which is acceptable. Overlap or horizontal scrolling is not, and the smoke test catches it.
- **Summary borders:** style `.summary-card` for all cards. Keep `.summary-card.first` for extra emphasis only, not the border itself; all prizes should look equally framed.
- **Fonts:** don't `@import` web fonts. Point `--font` at `"Brand Font"`, or add a font file to the theme folder with your own `@font-face`.
- **Respect reduced motion.** Wrap animated decorations in `@media (prefers-reduced-motion: reduce) { … animation: none }`.

### Existing themes
| Name | Notes |
| --- | --- |
| `default` ("Classic") | Dark navy and gold, pill buttons, rainbow pie sweep, system fonts. The default (`config.theme`). |
| `bekuplast` | Matches bekuplast.pl: `#f3f3f3` page, white cards, green `#78b146`, text `#424242`, Brand Font (Manrope), bordered uppercase `.tag` with a small square dot, square-ish corners. |
| `bekuplast-christmas` | Red panels with gold trim, gold Spin button, red drum with gold names, gold/red/green garland under the top bar, two-layer CSS snow, ❄ tags, cream logo plaque, pie in red/gold/green blocks (`--wheel-many: blocks`). |

---

## 9. Configuration reference (`js/config.js`)
`logoUrl`, `startImage`, `language`, `theme`, `themes` (each with `label`, optional `logoUrl`, `startImage`, `css`), `showPrizeList`, `data.{namesUrl,prizesUrl}`, `drawOrder` (`asc`/`desc`), `spinOnNext` (default `false`), `autoSummaryDelayMs`, `wheel.{style,durationMs,durationJitterMs,easingPower,minTravelItems,pieLaps,drumVisibleItems,idleSpeed,windUpMs}`, `sound`, `confetti`, `flyAnimationMs`, `persist`, `storageKey`, `csv.{nameHeaderKeywords,prizeColumns,exportDelimiter}`. Each one is commented in the file. Prefer adding a config option over hard-coding behaviour.

---

## 10. Testing

```bash
node tests/smoke.js     # ~30 s; exit code 0 = pass
```
- **Setup:** needs Playwright with Chromium. It's pre-installed in Claude Code cloud sessions. Locally: `npm i -D playwright && npx playwright install chromium`, run outside the repo or ignore `node_modules`.
- **Speed and isolation:** it serves the repo itself and rewrites `config.js` on the fly for fast spins. Any Google Fonts request is blocked, so it runs offline.
- **What it checks:**
  - The start screen first, then a full draw with the two-press flow and unique winners.
  - The prize list hidden by default and its Settings switch; hiding and showing the top bar.
  - Every summary card having the same border.
  - The brand font loading in the themes that use it.
  - Persistence across a reload, the summary, and reset.
  - Every registered theme loads and defines its variables.
  - All languages have identical keys and switch the UI.
  - Top-bar layout in every theme × language × width.
  - No JavaScript errors.
- **Extend it when you add behaviour.** For visual changes, also take Playwright screenshots (Chromium at `/opt/pw-browsers` in cloud sessions) and look at them. CSS mistakes don't throw errors.

Manual run: `python3 -m http.server 8000` and open http://localhost:8000. Opening `index.html` from disk works, but then data has to be uploaded through Settings.

---

## 11. Deployment & git

- **Deploy:** pushing to **`main`** deploys automatically (`.github/workflows/pages.yml`; Pages source = GitHub Actions). A deploy takes about 1–5 minutes.
- **What gets published:** the workflow copies **only** `index.html css js data images themes fonts`. A new top-level folder needed at runtime must be added to the `cp -r` line. `tests/` and the docs are intentionally not published.
- **Before pushing:**
  1. Run the smoke test.
  2. Update `README.md` (user-facing) and this file (technical) when you change behaviour, config options, i18n keys or the theme contract.
- **Repo history:** the repository is `wronkam/bekuplast-lottery`. Work has been done on a feature branch and fast-forwarded to `main`.
