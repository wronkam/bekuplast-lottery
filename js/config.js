/*
 * ============================================================
 *  LOTTERY CONFIGURATION
 *  Everything you are likely to want to tweak lives here.
 *  Colours / fonts / sizes live in css/styles.css (":root" block).
 * ============================================================
 */
window.LOTTERY_CONFIG = {
  /* ---------- Branding ----------
   * Title & subtitle are translated texts: see `title` / `subtitle` in js/i18n.js. */
  logoUrl: null, // shown next to the title and on the summary (null = no logo); a theme can override it

  /* ---------- Language ----------
   * UI texts live in js/i18n.js (one dictionary per language).
   * The language button in the top bar cycles EN → PL → DE; ?lang=de in the URL also works. */
  language: 'en',

  /* ---------- Themes (the "Style" drop-down in the top bar) ----------
   * A theme is a folder themes/<name>/ with theme.css (+ assets) – start by copying
   * themes/_template/. Register it here; the order here is the order in the drop-down.
   *   label   – name shown in the drop-down (a string, or { en: '…', pl: '…' } per language)
   *   logoUrl – optional logo for this theme (null/omitted = global logoUrl)
   *   css     – optional custom stylesheet path (default: themes/<name>/theme.css)
   * Pick the default here, from the drop-down, or with ?theme=<name> in the URL. */
  theme: 'default',
  themes: {
    default: { label: { en: 'Classic', pl: 'Klasyczny', de: 'Klassisch' } },
    bekuplast: { label: 'bekuplast', logoUrl: 'themes/bekuplast/logo.png' },
    'bekuplast-christmas': {
      label: { en: 'bekuplast Christmas', pl: 'bekuplast świąteczny', de: 'bekuplast Weihnachten' },
      logoUrl: 'themes/bekuplast/logo.png',
    },
  },

  /* ---------- Data sources (relative to index.html, or absolute URLs) ---------- */
  data: {
    namesUrl: 'data/names.csv',
    prizesUrl: 'data/prizes.csv',
  },

  /* ---------- Flow ---------- */
  // 'asc'  -> start with prize #1 (lowest number) and go up
  // 'desc' -> start with the highest number and finish with #1 (grand prize last)
  drawOrder: 'asc',
  // false -> after a winner is revealed, the next press only shows the next prize; another press spins
  // true  -> one press moves to the next prize AND spins straight away
  spinOnNext: false,
  // Show the summary automatically this many ms after the last winner (null = wait for button)
  autoSummaryDelayMs: null,

  /* ---------- Wheel ---------- */
  wheel: {
    style: 'drum',          // 'drum' (vertical reel, best for hundreds of names) | 'pie' (classic wheel)
    durationMs: 7000,       // spin length
    durationJitterMs: 1500, // +/- random variation of spin length
    easingPower: 3,         // higher = longer, slower "crawl" at the end (suspense)
    minTravelItems: 120,    // drum: minimum number of names that fly past during a spin
    pieLaps: 4,             // pie: minimum full rotations
    drumVisibleItems: 11,   // drum: how many names are visible at once
    idleSpeed: 0.6,         // names per second the wheel drifts while idle (0 = still)
    windUpMs: 350,          // small "pull back" before the spin starts (0 = none)
  },

  /* ---------- Effects ---------- */
  sound: true,     // default; can be toggled in the UI
  confetti: true,
  flyAnimationMs: 1100, // how long the winner's name takes to fly under the prize

  /* ---------- Persistence ---------- */
  // Results are saved in the browser, so an accidental refresh does not lose the draw.
  persist: true,
  storageKey: 'bekuplast-lottery',

  /* ---------- CSV parsing ---------- */
  csv: {
    // Header cells (lower case) that mark the first row of the names file as a header.
    // When a header is detected, only matching columns are used and joined with a space
    // (so "first name,last name,email" -> "Jan Kowalski").
    nameHeaderKeywords: [
      'name', 'names', 'full name', 'fullname', 'first name', 'firstname', 'first_name',
      'last name', 'lastname', 'last_name', 'surname', 'participant',
      'imię', 'imie', 'nazwisko', 'imię i nazwisko', 'imie i nazwisko', 'uczestnik',
      'vorname', 'nachname', 'vollständiger name', 'teilnehmer', 'teilnehmerin',
    ],
    // Accepted header names for each column of the prizes file.
    prizeColumns: {
      rank: ['rank', 'place', 'number', 'no', 'nr', '#', 'position', 'miejsce', 'numer', 'pozycja', 'kolejność', 'platz', 'rang', 'nummer'],
      name: ['prize', 'name', 'prize name', 'title', 'nagroda', 'nazwa', 'preis', 'gewinn', 'bezeichnung'],
      image: ['image', 'img', 'picture', 'photo', 'path', 'image path', 'file', 'obraz', 'obrazek', 'zdjęcie', 'zdjecie', 'plik', 'bild', 'foto', 'datei'],
      description: ['description', 'desc', 'details', 'opis', 'beschreibung'],
    },
    exportDelimiter: ',', // use ';' if your Excel expects semicolons
  },
};

/** Stylesheet path of a theme (used by index.html and js/app.js). */
window.lotteryThemeHref = function (name) {
  var t = window.LOTTERY_CONFIG.themes[name] || {};
  return t.css || 'themes/' + name + '/theme.css';
};
