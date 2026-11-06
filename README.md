# Bekuplast Lottery

A simple, dependency-free HTML prize lottery: load a list of names and a list of prizes, spin the wheel, and the winner's name moves under the prize. Winners drop out of later draws, and you get a summary at the end.

### ▶ Live demo: **https://wronkam.github.io/bekuplast-lottery/**

The demo uses mock data: 300 names with Polish and other non-ASCII characters, and 8 prizes.

---

## Usage instructions

### Running the draw

1. Open the page. It shows the first prize; by default that is **prize #1**. See [Configuration](#configuration) to start from the last prize instead.
2. Press **Spin!** (or <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>→</kbd>, or a presentation clicker's *next* key). The wheel spins and stops on a random participant, and the name flies under the prize.
3. Press **Next prize ➜** to draw the next prize. Previous winners are removed from the wheel.
4. After the last prize, press **Show results 🏆** to see the summary of all prizes and winners. From there you can **Download CSV**, **Print**, go back, or reset.
5. **Reset** (top right, or on the summary) clears all results after you confirm.

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>→</kbd> / <kbd>PageDown</kbd> | Main button (spin / next / results) |
| <kbd>F</kbd> | Toggle fullscreen |
| <kbd>M</kbd> | Toggle sound |
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
| `title`, `subtitle`, `logoUrl` | Branding in the top bar |
| `drawOrder` | `'asc'` = start with prize #1; `'desc'` = start with the highest number and finish with the grand prize #1. Also switchable in Settings. |
| `spinOnNext` | `true`: one press moves to the next prize and spins. `false`: first press shows the prize, second press spins. |
| `autoSummaryDelayMs` | Show the summary automatically after the last draw (`null` = wait for the button) |
| `wheel.style` | `'drum'` (vertical reel, readable with hundreds of names) or `'pie'` (classic wheel). Also switchable in Settings. |
| `wheel.durationMs`, `durationJitterMs`, `easingPower` | Spin length and how long the suspenseful slow-down lasts |
| `sound`, `confetti`, `flyAnimationMs` | Effects |
| `text.*` | Every UI text, including the rank label (`1st prize`). Translate here. |

**Look & feel:** colours, fonts and column widths are CSS variables at the top of **`css/styles.css`** (`:root`). The wheel canvas reads the same variables, so a theme change applies everywhere.

**Adding a wheel style:** add a renderer function to `RENDERERS` in `js/wheel.js`. It receives the canvas context and draws `this.items` at position `this.p`. It then appears in the Settings drop-down automatically.

## Project structure

```
index.html            page layout (stage, summary, dialogs)
css/styles.css        theme variables + layout
js/config.js          all settings & texts
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
