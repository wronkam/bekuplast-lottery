/*
 * ============================================================
 *  LOTTERY CONFIGURATION
 *  Everything you are likely to want to tweak lives here.
 *  Colours / fonts / sizes live in css/styles.css (":root" block).
 * ============================================================
 */
window.LOTTERY_CONFIG = {
  /* ---------- Branding ---------- */
  title: 'Bekuplast Lottery',
  subtitle: 'Prize draw',
  logoUrl: null, // e.g. 'images/logo.png' – shown next to the title when set

  /* ---------- Data sources (relative to index.html, or absolute URLs) ---------- */
  data: {
    namesUrl: 'data/names.csv',
    prizesUrl: 'data/prizes.csv',
  },

  /* ---------- Flow ---------- */
  // 'asc'  -> start with prize #1 (lowest number) and go up
  // 'desc' -> start with the highest number and finish with #1 (grand prize last)
  drawOrder: 'asc',
  // true  -> after a winner is revealed, ONE button press moves to the next prize AND spins
  // false -> first press shows the next prize, second press spins
  spinOnNext: true,
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
    ],
    // Accepted header names for each column of the prizes file.
    prizeColumns: {
      rank: ['rank', 'place', 'number', 'no', 'nr', '#', 'position', 'miejsce', 'numer', 'pozycja', 'kolejność'],
      name: ['prize', 'name', 'prize name', 'title', 'nagroda', 'nazwa'],
      image: ['image', 'img', 'picture', 'photo', 'path', 'image path', 'file', 'obraz', 'obrazek', 'zdjęcie', 'zdjecie', 'plik'],
      description: ['description', 'desc', 'details', 'opis'],
    },
    exportDelimiter: ',', // use ';' if your Excel expects semicolons
  },

  /* ---------- Texts (translate here) ---------- */
  text: {
    spin: 'Spin!',
    spinning: 'Drawing…',
    next: 'Next prize ➜',
    showNext: 'Show next prize',
    showSummary: 'Show results 🏆',
    winnerLabel: 'Winner',
    noWinner: 'No eligible participants left',
    pending: '?',
    prizesHeading: 'Prizes',
    summaryTitle: 'Results',
    rank: (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' prize';
    },
    progress: (i, total) => `Prize ${i} of ${total}`,
    pool: (eligible, total) => `${eligible} of ${total} participants in the draw`,
    resetQuestion: 'Reset the lottery? All drawn winners will be lost.',
    loadError: 'Could not load the data files. Open Settings and upload a names CSV and a prizes CSV.',
  },
};
