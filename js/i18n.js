/*
 * ============================================================
 *  UI TEXTS / TRANSLATIONS
 *  One dictionary per language. The language button in the top bar
 *  cycles through them in the order listed here.
 *  To add a language: copy the `en` block, give it a new code (e.g. `de`)
 *  and translate. Missing keys fall back to English.
 *  Values are strings or functions (for texts with numbers/names in them).
 *  In index.html, elements with data-i18n="key" get the text automatically,
 *  and data-i18n-title="key" sets the tooltip.
 * ============================================================
 */
window.LOTTERY_I18N = {
  en: {
    languageName: 'English',
    title: 'Bekuplast Lottery',
    subtitle: 'Prize draw',

    // stage
    spin: 'Spin!',
    spinning: 'Drawing…',
    next: 'Next prize ➜',
    showNext: 'Show next prize',
    showSummary: 'Show results 🏆',
    winnerLabel: 'Winner',
    noWinner: 'No eligible participants left',
    pending: '?',
    prizesHeading: 'Prizes',
    rank: (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' prize';
    },
    progress: (i, total) => `Prize ${i} of ${total}`,
    pool: (eligible, total) => `${eligible} of ${total} participants in the draw`,

    // top bar
    soundTip: 'Sound on/off (M)',
    fullscreenTip: 'Fullscreen (F)',
    settingsTip: 'Data & settings',
    themeTip: 'Style',
    languageTip: 'Language (L)',
    reset: 'Reset',
    resetTip: 'Reset the lottery',

    // summary
    summaryTag: 'Prize draw',
    summaryTitle: 'Results',
    downloadCsv: 'Download CSV',
    print: 'Print',
    backToStage: 'Back to stage',
    resetLottery: 'Reset lottery',
    csvHeader: ['rank', 'prize', 'winner'],
    csvFileName: 'lottery-results.csv',

    // confirm dialogs
    cancel: 'Cancel',
    yesReset: 'Yes, reset',
    resetQuestion: 'Reset the lottery? All drawn winners will be lost.',
    loadResetQuestion: 'Loading new data resets the lottery. Continue?',
    loadResetOk: 'Load & reset',
    demoResetQuestion: 'Switch back to the demo data? This resets the lottery.',
    demoResetOk: 'Switch & reset',

    // settings dialog
    settingsTitle: 'Data & settings',
    loadOwnData: 'Load your own data',
    namesCsv: 'Names CSV',
    namesHint: '(one name per row, UTF-8)',
    prizesCsv: 'Prizes CSV',
    prizesHint: '(columns: rank, name, image)',
    prizeImages: 'Prize images',
    imagesHint: '(optional, select many; matched by file name from the image column)',
    templates: 'Templates:',
    loadingResets: 'Loading new data resets the lottery.',
    loadFiles: 'Load files',
    restoreDemo: 'Restore demo data',
    options: 'Options',
    wheelStyle: 'Wheel style',
    style_drum: 'Drum (reel)',
    style_pie: 'Classic wheel',
    drawOrder: 'Draw order',
    orderAsc: 'Prize #1 first',
    orderDesc: 'Highest number first, #1 last',
    sound: 'Sound',
    orderLocked: 'Draw order can be changed only before the first draw (or after a reset).',
    close: 'Close',
    dataStatus: (source, names, prizes) =>
      `${source === 'demo' ? 'Demo data' : 'Uploaded data'}: ${names} names, ${prizes} prizes.`,

    // errors & warnings
    loadError: 'Could not load the data files. Open Settings and upload a names CSV and a prizes CSV.',
    fileProtocolError: 'The page was opened from disk, so the browser blocks reading data/*.csv. Upload the files here (or run a local web server).',
    chooseAnyFile: 'Choose at least one file.',
    chooseNames: 'Please choose a names CSV.',
    choosePrizes: 'Please choose a prizes CSV.',
    namesFile: 'Names file',
    prizesFile: 'Prizes file',
    encodingWarning: (file, enc) => `${file} is not valid UTF-8 – read as ${enc}. Save it as "CSV UTF-8" to be safe.`,
    namesEmpty: 'The names file is empty.',
    noNames: 'No names found in the names file.',
    duplicates: (list) => `Duplicate names (kept as separate entries): ${list}`,
    prizesEmpty: 'The prizes file is empty.',
    noPrizes: 'No prizes found in the prizes file.',
    badRank: (row, rank) => `Row ${row}: missing/invalid number, using ${rank}.`,
    defaultPrizeName: (rank) => `Prize ${rank}`,
  },

  pl: {
    languageName: 'Polski',
    title: 'Loteria Bekuplast',
    subtitle: 'Losowanie nagród',

    spin: 'Losuj!',
    spinning: 'Losowanie…',
    next: 'Następna nagroda ➜',
    showNext: 'Pokaż następną nagrodę',
    showSummary: 'Pokaż wyniki 🏆',
    winnerLabel: 'Wylosowano',
    noWinner: 'Brak uczestników do losowania',
    pending: '?',
    prizesHeading: 'Nagrody',
    rank: (n) => `${n}. nagroda`,
    progress: (i, total) => `Nagroda ${i} z ${total}`,
    pool: (eligible, total) => `W losowaniu: ${eligible} z ${total} uczestników`,

    soundTip: 'Dźwięk wł./wył. (M)',
    fullscreenTip: 'Pełny ekran (F)',
    settingsTip: 'Dane i ustawienia',
    themeTip: 'Styl',
    languageTip: 'Język (L)',
    reset: 'Reset',
    resetTip: 'Zresetuj loterię',

    summaryTag: 'Losowanie nagród',
    summaryTitle: 'Wyniki',
    downloadCsv: 'Pobierz CSV',
    print: 'Drukuj',
    backToStage: 'Wróć do losowania',
    resetLottery: 'Zresetuj loterię',
    csvHeader: ['miejsce', 'nagroda', 'zwycięzca'],
    csvFileName: 'wyniki-loterii.csv',

    cancel: 'Anuluj',
    yesReset: 'Tak, resetuj',
    resetQuestion: 'Zresetować loterię? Wszystkie dotychczasowe wyniki zostaną utracone.',
    loadResetQuestion: 'Wczytanie nowych danych zresetuje loterię. Kontynuować?',
    loadResetOk: 'Wczytaj i resetuj',
    demoResetQuestion: 'Wrócić do danych demonstracyjnych? Loteria zostanie zresetowana.',
    demoResetOk: 'Przełącz i resetuj',

    settingsTitle: 'Dane i ustawienia',
    loadOwnData: 'Wczytaj własne dane',
    namesCsv: 'Plik CSV z uczestnikami',
    namesHint: '(jedno imię i nazwisko w wierszu, UTF-8)',
    prizesCsv: 'Plik CSV z nagrodami',
    prizesHint: '(kolumny: miejsce, nagroda, obraz)',
    prizeImages: 'Zdjęcia nagród',
    imagesHint: '(opcjonalnie, można zaznaczyć wiele; dopasowane po nazwie pliku z kolumny obrazu)',
    templates: 'Szablony:',
    loadingResets: 'Wczytanie nowych danych resetuje loterię.',
    loadFiles: 'Wczytaj pliki',
    restoreDemo: 'Przywróć dane demo',
    options: 'Opcje',
    wheelStyle: 'Rodzaj koła',
    style_drum: 'Bęben',
    style_pie: 'Klasyczne koło',
    drawOrder: 'Kolejność losowania',
    orderAsc: 'Od nagrody nr 1',
    orderDesc: 'Od najwyższego numeru, nr 1 na końcu',
    sound: 'Dźwięk',
    orderLocked: 'Kolejność można zmienić tylko przed pierwszym losowaniem (lub po resecie).',
    close: 'Zamknij',
    dataStatus: (source, names, prizes) =>
      `${source === 'demo' ? 'Dane demonstracyjne' : 'Wczytane dane'}: uczestnicy: ${names}, nagrody: ${prizes}.`,

    loadError: 'Nie udało się wczytać plików z danymi. Otwórz ustawienia i wgraj plik CSV z uczestnikami oraz plik CSV z nagrodami.',
    fileProtocolError: 'Strona została otwarta z dysku, więc przeglądarka blokuje odczyt data/*.csv. Wgraj pliki tutaj (lub uruchom lokalny serwer WWW).',
    chooseAnyFile: 'Wybierz co najmniej jeden plik.',
    chooseNames: 'Wybierz plik CSV z uczestnikami.',
    choosePrizes: 'Wybierz plik CSV z nagrodami.',
    namesFile: 'Plik z uczestnikami',
    prizesFile: 'Plik z nagrodami',
    encodingWarning: (file, enc) => `${file} nie jest zapisany w UTF-8 – odczytano jako ${enc}. Najlepiej zapisz go jako „CSV UTF-8”.`,
    namesEmpty: 'Plik z uczestnikami jest pusty.',
    noNames: 'Nie znaleziono uczestników w pliku.',
    duplicates: (list) => `Powtórzone nazwiska (zachowane jako osobne wpisy): ${list}`,
    prizesEmpty: 'Plik z nagrodami jest pusty.',
    noPrizes: 'Nie znaleziono nagród w pliku.',
    badRank: (row, rank) => `Wiersz ${row}: brak lub błędny numer, użyto ${rank}.`,
    defaultPrizeName: (rank) => `Nagroda ${rank}`,
  },
};

/* ---- tiny translation helper: L.i18n.t('key', ...args), L.i18n.T.key ---- */
(function (L) {
  'use strict';
  const dicts = window.LOTTERY_I18N;
  let lang = 'en';
  const lookup = (key) => {
    const d = dicts[lang] || {};
    return key in d ? d[key] : dicts.en[key];
  };
  L.i18n = {
    languages: () => Object.keys(dicts),
    get lang() { return lang; },
    set(code) { if (dicts[code]) lang = code; document.documentElement.lang = lang; },
    /** Translate: functions are called with the extra arguments. */
    t(key, ...args) {
      const v = lookup(key);
      if (v === undefined) return key;
      return typeof v === 'function' ? v(...args) : v;
    },
    /** T.key reads the current language (T.rank(1), T.spin …). */
    T: new Proxy({}, { get: (_, key) => lookup(key) }),
    /** Fill static texts in the page: data-i18n (text) and data-i18n-title (tooltip). */
    applyStatic(root = document) {
      root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = L.i18n.t(el.dataset.i18n); });
      root.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.title = L.i18n.t(el.dataset.i18nTitle);
        el.setAttribute('aria-label', el.title);
      });
    },
  };
})((window.Lottery = window.Lottery || {}));
