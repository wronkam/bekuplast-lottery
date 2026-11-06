/* CSV reading & parsing (UTF-8, quoted fields, auto-detected , ; tab | delimiters). */
(function (L) {
  'use strict';

  /** Decode bytes as UTF-8 (BOM stripped). Falls back to Windows-1250 if the bytes are clearly not UTF-8. */
  function decode(buffer) {
    const utf8 = new TextDecoder('utf-8').decode(buffer);
    if (!utf8.includes('�')) return { text: utf8, encoding: 'utf-8' };
    try {
      const cp = new TextDecoder('windows-1250').decode(buffer);
      return { text: cp, encoding: 'windows-1250' };
    } catch (e) {
      return { text: utf8, encoding: 'utf-8' };
    }
  }

  function countOutsideQuotes(line, ch) {
    let n = 0, q = false;
    for (const c of line) {
      if (c === '"') q = !q;
      else if (!q && c === ch) n++;
    }
    return n;
  }

  function detectDelimiter(text) {
    const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
    let best = ',', bestCount = 0;
    for (const d of [',', ';', '\t', '|']) {
      const c = countOutsideQuotes(first, d);
      if (c > bestCount) { best = d; bestCount = c; }
    }
    return best;
  }

  /** Parse CSV text into an array of rows (arrays of trimmed strings). Empty rows are dropped. */
  function parse(text, delimiter) {
    text = String(text).replace(/^﻿/, '');
    delimiter = delimiter || detectDelimiter(text);
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"' && field.trim() === '') {
        inQuotes = true; field = '';
      } else if (c === delimiter) {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows
      .map((r) => r.map((f) => f.trim()))
      .filter((r) => r.some((f) => f !== ''));
  }

  const t = (...a) => L.i18n.t(...a);
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  /**
   * Names file: one participant per row. Optional header row.
   * Multiple columns are joined with a space (e.g. first name + last name).
   */
  function parseNames(text, cfg) {
    const rows = parse(text);
    const warnings = [];
    if (!rows.length) throw new Error(t('namesEmpty'));
    const keywords = new Set(cfg.csv.nameHeaderKeywords.map(norm));
    let cols = null;
    if (rows[0].some((c) => keywords.has(norm(c)))) {
      const header = rows.shift();
      cols = header.map((h, i) => (keywords.has(norm(h)) ? i : -1)).filter((i) => i >= 0);
    }
    const names = rows
      .map((r) => (cols ? cols.map((i) => r[i] || '') : r).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (!names.length) throw new Error(t('noNames'));
    const seen = new Map();
    names.forEach((n) => seen.set(n, (seen.get(n) || 0) + 1));
    const dups = [...seen].filter(([, c]) => c > 1).map(([n]) => n);
    if (dups.length) warnings.push(t('duplicates', dups.slice(0, 5).join(', ') + (dups.length > 5 ? '…' : '')));
    return { names, warnings };
  }

  /**
   * Prizes file: columns rank, name, image (+ optional description).
   * Header recommended; without a recognised header columns are read in that order.
   */
  function parsePrizes(text, cfg) {
    const rows = parse(text);
    const warnings = [];
    if (!rows.length) throw new Error(t('prizesEmpty'));
    const aliases = cfg.csv.prizeColumns;
    const header = rows[0].map(norm);
    const find = (key) => header.findIndex((h) => aliases[key].map(norm).includes(h));
    let idx = { rank: find('rank'), name: find('name'), image: find('image'), description: find('description') };
    if (idx.name >= 0 || idx.rank >= 0) rows.shift();
    else idx = { rank: 0, name: 1, image: 2, description: 3 };

    const prizes = rows.map((r, i) => {
      const rawRank = idx.rank >= 0 ? r[idx.rank] : '';
      let rank = parseInt(String(rawRank).replace(/[^\d-]/g, ''), 10);
      if (!Number.isFinite(rank)) {
        rank = i + 1;
        warnings.push(t('badRank', i + 2, rank));
      }
      return {
        id: 'p' + i,
        rank,
        name: (idx.name >= 0 ? r[idx.name] : '') || t('defaultPrizeName', rank),
        image: idx.image >= 0 ? r[idx.image] || '' : '',
        description: idx.description >= 0 ? r[idx.description] || '' : '',
      };
    });
    if (!prizes.length) throw new Error(t('noPrizes'));
    prizes.sort((a, b) => a.rank - b.rank);
    return { prizes, warnings };
  }

  /** Build a CSV string (quoted when needed) with a UTF-8 BOM so Excel detects the encoding. */
  function stringify(rows, delimiter = ',') {
    const q = (v) => {
      const s = String(v == null ? '' : v);
      return /["\r\n]/.test(s) || s.includes(delimiter) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + rows.map((r) => r.map(q).join(delimiter)).join('\r\n');
  }

  async function readFile(file) {
    return decode(await file.arrayBuffer());
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return decode(await res.arrayBuffer());
  }

  L.csv = { parse, parseNames, parsePrizes, stringify, readFile, fetchText, decode };
})((window.Lottery = window.Lottery || {}));
