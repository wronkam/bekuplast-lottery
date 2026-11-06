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
    orderAsc: 'First to last (1st prize drawn first)',
    orderDesc: 'Last to first (1st prize drawn last)',
    sound: 'Sound',
    orderResetHint: 'Changing the draw order resets the lottery.',
    orderResetQuestion: 'Change the draw order? This resets the lottery and all drawn winners will be lost.',
    orderResetOk: 'Change & reset',
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
    orderAsc: 'Od pierwszej do ostatniej (1. nagroda losowana jako pierwsza)',
    orderDesc: 'Od ostatniej do pierwszej (1. nagroda losowana na końcu)',
    sound: 'Dźwięk',
    orderResetHint: 'Zmiana kolejności resetuje loterię.',
    orderResetQuestion: 'Zmienić kolejność losowania? Loteria zostanie zresetowana, a dotychczasowe wyniki utracone.',
    orderResetOk: 'Zmień i resetuj',
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

  de: {
    languageName: 'Deutsch',
    title: 'Bekuplast Verlosung',
    subtitle: 'Preisverlosung',

    spin: 'Drehen!',
    spinning: 'Ziehung läuft…',
    next: 'Nächster Preis ➜',
    showSummary: 'Ergebnisse zeigen 🏆',
    winnerLabel: 'Gezogen',
    noWinner: 'Keine Teilnehmenden mehr übrig',
    pending: '?',
    prizesHeading: 'Preise',
    rank: (n) => `${n}. Preis`,
    progress: (i, total) => `Preis ${i} von ${total}`,
    pool: (eligible, total) => `${eligible} von ${total} Teilnehmenden in der Ziehung`,

    soundTip: 'Ton an/aus (M)',
    fullscreenTip: 'Vollbild (F)',
    settingsTip: 'Daten & Einstellungen',
    themeTip: 'Stil',
    languageTip: 'Sprache (L)',
    reset: 'Zurücksetzen',
    resetTip: 'Verlosung zurücksetzen',

    summaryTag: 'Preisverlosung',
    summaryTitle: 'Ergebnisse',
    downloadCsv: 'CSV herunterladen',
    print: 'Drucken',
    backToStage: 'Zurück zur Ziehung',
    resetLottery: 'Verlosung zurücksetzen',
    csvHeader: ['platz', 'preis', 'gewinner'],
    csvFileName: 'verlosung-ergebnisse.csv',

    cancel: 'Abbrechen',
    yesReset: 'Ja, zurücksetzen',
    resetQuestion: 'Verlosung zurücksetzen? Alle bisher gezogenen Gewinner gehen verloren.',
    loadResetQuestion: 'Das Laden neuer Daten setzt die Verlosung zurück. Fortfahren?',
    loadResetOk: 'Laden & zurücksetzen',
    demoResetQuestion: 'Zu den Demodaten zurückkehren? Die Verlosung wird zurückgesetzt.',
    demoResetOk: 'Wechseln & zurücksetzen',

    settingsTitle: 'Daten & Einstellungen',
    loadOwnData: 'Eigene Daten laden',
    namesCsv: 'Teilnehmer-CSV',
    namesHint: '(ein Name pro Zeile, UTF-8)',
    prizesCsv: 'Preise-CSV',
    prizesHint: '(Spalten: Platz, Preis, Bild)',
    prizeImages: 'Preisbilder',
    imagesHint: '(optional, Mehrfachauswahl; Zuordnung über den Dateinamen in der Bildspalte)',
    templates: 'Vorlagen:',
    loadingResets: 'Das Laden neuer Daten setzt die Verlosung zurück.',
    loadFiles: 'Dateien laden',
    restoreDemo: 'Demodaten wiederherstellen',
    options: 'Optionen',
    wheelStyle: 'Radtyp',
    style_drum: 'Trommel',
    style_pie: 'Klassisches Glücksrad',
    drawOrder: 'Reihenfolge',
    orderAsc: 'Vom ersten zum letzten (1. Preis zuerst)',
    orderDesc: 'Vom letzten zum ersten (1. Preis zuletzt)',
    sound: 'Ton',
    orderResetHint: 'Eine Änderung der Reihenfolge setzt die Verlosung zurück.',
    orderResetQuestion: 'Reihenfolge ändern? Die Verlosung wird zurückgesetzt und alle bisherigen Gewinner gehen verloren.',
    orderResetOk: 'Ändern & zurücksetzen',
    close: 'Schließen',
    dataStatus: (source, names, prizes) =>
      `${source === 'demo' ? 'Demodaten' : 'Geladene Daten'}: ${names} Teilnehmende, ${prizes} Preise.`,

    loadError: 'Die Datendateien konnten nicht geladen werden. Öffne die Einstellungen und lade eine Teilnehmer-CSV und eine Preise-CSV hoch.',
    fileProtocolError: 'Die Seite wurde direkt von der Festplatte geöffnet, daher blockiert der Browser das Lesen von data/*.csv. Lade die Dateien hier hoch (oder starte einen lokalen Webserver).',
    chooseAnyFile: 'Bitte mindestens eine Datei auswählen.',
    chooseNames: 'Bitte eine Teilnehmer-CSV auswählen.',
    choosePrizes: 'Bitte eine Preise-CSV auswählen.',
    namesFile: 'Die Teilnehmerdatei',
    prizesFile: 'Die Preisdatei',
    encodingWarning: (file, enc) => `${file} ist kein gültiges UTF-8 – als ${enc} gelesen. Am besten als „CSV UTF-8“ speichern.`,
    namesEmpty: 'Die Teilnehmerdatei ist leer.',
    noNames: 'In der Teilnehmerdatei wurden keine Namen gefunden.',
    duplicates: (list) => `Doppelte Namen (als separate Einträge behalten): ${list}`,
    prizesEmpty: 'Die Preisdatei ist leer.',
    noPrizes: 'In der Preisdatei wurden keine Preise gefunden.',
    badRank: (row, rank) => `Zeile ${row}: Nummer fehlt oder ist ungültig, verwende ${rank}.`,
    defaultPrizeName: (rank) => `Preis ${rank}`,
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
