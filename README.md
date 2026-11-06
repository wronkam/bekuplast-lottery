# Bekuplast Lottery

A simple, dependency-free HTML prize lottery: load a list of names and a list of prizes, spin the wheel, and the winner's name moves under the prize. Winners drop out of later draws, and you get a summary at the end.

### ▶ Live demo: **https://wronkam.github.io/bekuplast-lottery/**

The demo uses mock data: 300 names with Polish and other non-ASCII characters, and 8 prizes.

---

## Usage instructions

### Running the draw

1. Open the page. It shows the first prize to draw; by default that is **prize #1**. To go **last to first** (finish with the grand prize), choose it under ⚙ → *Draw order*, or set `drawOrder` in the [configuration](#configuration).
2. Press **Spin!** (or <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>→</kbd>, or a presentation clicker's *next* key). The wheel spins and stops on a random participant, and the name flies under the prize.
3. Press **Next prize ➜** to show the next prize, then press **Spin!** again to draw it. Each prize gets its own moment before the spin. Previous winners are removed from the wheel.
4. After the last prize, press **Show results 🏆** to see the summary of all prizes and winners. From there you can **Download CSV**, **Print**, go back, or reset.
5. **Reset** (top right, or on the summary) clears all results after you confirm.

The top bar also has a **Style** drop-down to switch the look (see [Themes](#themes)) and an **EN | PL | DE** switch to change the language (English, Polish, German): click a code to pick it. Both choices are remembered in this browser, and switching never affects the draw in progress.

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>→</kbd> / <kbd>PageDown</kbd> | Main button (spin / next / results) |
| <kbd>F</kbd> | Toggle fullscreen |
| <kbd>M</kbd> | Toggle sound |
| <kbd>L</kbd> | Switch language (EN → PL → DE) |
| <kbd>Esc</kbd> | Close the summary |

**Progress is saved in the browser** (localStorage). If the page is refreshed by accident, the draw continues where it stopped. The winner is chosen and saved the moment the spin starts, so refreshing during a spin cannot change the result. Use **Reset** to start over.

**Fairness:** winners are picked uniformly at random with `crypto.getRandomValues` (with no modulo bias). The wheel animation is then aimed at the chosen name.

### Using your own data

There are two ways to do it:

**A. Upload in the browser (no code changes).** Click **⚙ (Data & settings)** and choose:
- a **names CSV**,
- a **prizes CSV**,
- optionally the **prize images**. Select all the image files at once. They are matched by *file name* against the `image` column.

Click **Load files**. The data is stored in this browser (IndexedDB) until you click **Restore demo data**. Loading new data resets the lottery.

**B. Replace the files in the repository** (they are then served by GitHub Pages for everyone):
- `data/names.csv`
- `data/prizes.csv`
- prize images in `images/prizes/`. Any web format works: `.jpg`, `.png`, `.svg`, `.webp`.

### CSV formats

Files should be **UTF-8**. Polish and other non-ASCII characters work. In Excel use *Save as → "CSV UTF-8"*. If a file turns out not to be UTF-8, the app falls back to Windows-1250 and shows a warning in Settings. The delimiter (`,` `;` tab `|`) is detected automatically, and quoted fields (`"Kowalski, Jan"`) are supported.

**names.csv**: one participant per row, with an optional header:

```csv
name
Żaneta Łęcka
Jürgen Müller
```

When there are several columns with a header, the name columns are joined, and other columns (e.g. email) are ignored:

```csv
imię;nazwisko;email
Jan;Kowalski;jan@example.com
```

**prizes.csv**: `rank` (1 = best prize), `name`, `image`, and an optional `description`:

```csv
rank,name,image,description
1,Weekend in the mountains,images/prizes/mountains.svg,2 nights with breakfast
2,"55"" 4K TV",images/prizes/tv.svg,
3,Electric bike,https://example.com/bike.jpg,
```

`image` can be a path relative to `index.html`, a full URL, or just a file name that you upload in Settings. A missing image shows a 🎁 placeholder. Polish header names work too (`miejsce`, `nagroda`, `obraz`, `opis`); see `csv.prizeColumns` in `js/config.js`.

The app is sized for a few hundred names and roughly 3–12 prizes, though it is not limited to that.

---

## Configuration

Almost everything is in **`js/config.js`**:

| Option | What it does |
| --- | --- |
| `logoUrl` | Logo in the top bar and on the summary (a theme can set its own) |
| `language` | Default language (`'en'`, `'pl'` or `'de'`); see [Language](#language) |
| `theme`, `themes` | Default theme and the list of themes; see [Themes](#themes) |
| `drawOrder` | `'asc'` = first to last (prize #1 drawn first); `'desc'` = last to first (highest number first, grand prize #1 last). Also switchable in Settings at any time; changing it mid-lottery asks to confirm and resets. |
| `spinOnNext` | `false` (default): after a winner, one press shows the next prize and another press spins. `true`: one press moves to the next prize and spins immediately. |
| `autoSummaryDelayMs` | Show the summary automatically after the last draw (`null` = wait for the button) |
| `wheel.style` | `'drum'` (vertical reel, readable with hundreds of names) or `'pie'` (classic wheel). Also switchable in Settings. |
| `wheel.durationMs`, `durationJitterMs`, `easingPower` | Spin length and how long the suspenseful slow-down lasts |
| `sound`, `confetti`, `flyAnimationMs` | Effects |

### Language

All UI texts, including the title, are in **`js/i18n.js`**, with one dictionary per language (`en`, `pl`, `de`). Change any text there. Texts with numbers in them (such as `1st prize` / `1. nagroda` or `Prize 1 of 8`) are small functions.

- Click **EN**, **PL** or **DE** in the top bar, or press <kbd>L</kbd> to cycle through them. The choice is remembered.
- `?lang=pl` or `?lang=de` in the URL opens the page in Polish or German.
- `language` in `js/config.js` sets the default.

To add a language, copy the `en` block in `js/i18n.js`, give it a new code (e.g. `cs`) and translate it. The button then includes it automatically. Missing keys fall back to English.

Prize names and descriptions come from your CSV, so they appear as written there.

### Themes

Pick the look from the **Style** drop-down in the top bar. Built-in themes:

| Theme | Look |
| --- | --- |
| `default` (*Classic*) | Dark navy with gold accents, pill buttons and a rainbow pie wheel |
| `bekuplast` | Matches [bekuplast.pl](https://www.bekuplast.pl/): light grey and white, brand green `#78b146`, the Manrope font, bordered uppercase labels and the company logo |
| `bekuplast-christmas` | Festive bekuplast: rich Christmas-red panels with gold trim, a gold Spin button and gold highlights, falling snow, a gold/red/green garland under the top bar, ❄ labels, and a red/gold/green wheel. Open it directly with `?theme=bekuplast-christmas`. |

The choice is remembered in this browser. `?theme=bekuplast` in the URL opens a specific theme, e.g. https://wronkam.github.io/bekuplast-lottery/?theme=bekuplast. `theme` in `js/config.js` sets the default for everyone.

#### Theme standard

Every theme follows the same structure, so adding one never needs code changes:

```
themes/
  _template/theme.css     ← documented starting point (every variable explained)
  default/theme.css
  bekuplast/theme.css
  bekuplast/logo.png      ← a theme's own assets live in its folder
  bekuplast-christmas/theme.css   (reuses the bekuplast logo)
```

- **`themes/<name>/theme.css` has three sections in a fixed order:**
  1. **Fonts:** an optional `@import`, e.g. from Google Fonts. Only the active theme's font is downloaded.
  2. **Variables:** the full list of CSS variables on `:root` (colours, font, corner radius, button style, wheel colours). Fill in all of them. They drive the whole layout and the wheel canvas.
  3. **Overrides:** optional CSS rules for any component (`.tag`, `.winner-slot`, `.results-list li`, …), written as plain selectors.
- **Only the active theme's stylesheet is loaded.** Switching swaps it without a reload.
- **The shared layout (`css/styles.css`) sits in a lower CSS cascade layer.** Any rule in a theme file therefore wins without special selectors or `!important`.
- **The wheel canvas reads the same variables** (`--wheel-*`, `--palette`), so it follows the theme. With many names the classic wheel uses either a smooth colour sweep (`--wheel-many: sweep`) or bold sectors in the palette colours (`--wheel-many: blocks`, as in the Christmas theme).

#### Adding a theme

1. Copy `themes/_template/` to `themes/<name>/` and edit the values in `theme.css`. Add a logo or other assets to the same folder if needed.
2. Register it in `js/config.js` under `themes`:
   ```js
   themes: {
     default:   { label: { en: 'Classic', pl: 'Klasyczny', de: 'Klassisch' } },
     bekuplast: { label: 'bekuplast', logoUrl: 'themes/bekuplast/logo.png' },
     myTheme:   { label: 'My theme', logoUrl: 'themes/myTheme/logo.png' },  // ← new
   },
   ```
   `label` is the name shown in the drop-down, either a string or one per language. `logoUrl` is optional.
3. Commit and push. The theme then appears in the **Style** drop-down.

**Logo:** `themes/bekuplast/logo.png` was cut from a screenshot of the website. For a sharper result, replace it with the official logo file (PNG or SVG) and update `logoUrl` if the file name changes.

**Adding a wheel style:** add a renderer function to `RENDERERS` in `js/wheel.js`. It receives the canvas context and draws `this.items` at position `this.p`. It then appears in the Settings drop-down automatically.

## Project structure

```
index.html            page layout (stage, summary, dialogs)
css/styles.css        shared layout & components (driven by CSS variables, in the "base" layer)
themes/<name>/        one folder per theme: theme.css (+ assets); start from themes/_template/
js/config.js          all settings: language, themes, flow, wheel, CSV parsing
js/i18n.js            UI texts in English, Polish & German (add more languages here)
js/csv.js             UTF-8 CSV reading/parsing, names & prizes loaders, CSV export
js/storage.js         saved progress (localStorage) and uploaded files (IndexedDB)
js/effects.js         fair RNG, sound (WebAudio), confetti, flying-name animation, theme colours
js/wheel.js           the wheel (drum & pie renderers, spin physics)
js/app.js             lottery flow / state machine and UI rendering
data/                 demo names.csv & prizes.csv
images/prizes/        demo prize images
```

There is no build step and there are no external dependencies. The scripts are plain `<script>` files, so the page also works offline.

## Running locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

You can also open `index.html` directly from disk. Browsers block reading `data/*.csv` from `file://`, so in that case the Settings dialog opens and you upload the CSV files there.

## Deployment (GitHub Pages)

`.github/workflows/pages.yml` publishes the site on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then available at https://wronkam.github.io/bekuplast-lottery/.
