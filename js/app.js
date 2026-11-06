/* Application flow: data loading, lottery state machine, UI rendering. */
(function () {
  'use strict';
  const L = window.Lottery;
  const cfg = window.LOTTERY_CONFIG;
  const T = cfg.text;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const prefs = Object.assign(
    { style: cfg.wheel.style, sound: cfg.sound, drawOrder: cfg.drawOrder },
    L.store.loadPrefs(),
  );

  let data = null;       // { names[], prizes[], byId, key, source, warnings[], namesText, prizesText, images[] }
  let state = null;      // { key, order[], current, results{prizeId: {nameIndex, name}}, showSummary }
  let wheel = null;
  let wheelPool = [];    // name indices currently on the wheel (same order as wheel items)
  let spinningPrizeId = null;
  let busy = false;

  /* =====================================================================
   * Data
   * ===================================================================== */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }

  function encodingWarning(label, decoded) {
    return decoded.encoding === 'utf-8' ? [] :
      [`${label} is not valid UTF-8 – read as ${decoded.encoding}. Save it as "CSV UTF-8" to be safe.`];
  }

  async function loadData() {
    const upload = await L.store.getUpload();
    let namesText, prizesText, images = [], source, warnings = [];
    if (upload) {
      source = 'upload';
      ({ namesText, prizesText } = upload);
      images = upload.images || [];
      warnings = upload.warnings || [];
    } else {
      source = 'demo';
      const [n, p] = await Promise.all([L.csv.fetchText(cfg.data.namesUrl), L.csv.fetchText(cfg.data.prizesUrl)]);
      namesText = n.text;
      prizesText = p.text;
      warnings.push(...encodingWarning('Names file', n), ...encodingWarning('Prizes file', p));
    }
    const N = L.csv.parseNames(namesText, cfg);
    const P = L.csv.parsePrizes(prizesText, cfg);
    const imageUrls = new Map(images.map((f) => [f.name.toLowerCase(), URL.createObjectURL(f)]));
    const resolveImage = (path) => {
      if (!path) return '';
      const base = path.split(/[\\/]/).pop().toLowerCase();
      return imageUrls.get(base) || path;
    };
    P.prizes.forEach((p) => { p.imageUrl = resolveImage(p.image); });
    return {
      names: N.names,
      prizes: P.prizes,
      byId: Object.fromEntries(P.prizes.map((p) => [p.id, p])),
      key: hash(N.names.join('\n') + '|' + P.prizes.map((p) => `${p.rank}:${p.name}`).join('|')),
      source,
      warnings: [...warnings, ...N.warnings, ...P.warnings],
      namesText, prizesText, images,
    };
  }

  /* =====================================================================
   * State
   * ===================================================================== */
  function createState() {
    const dir = prefs.drawOrder === 'desc' ? -1 : 1;
    const order = data.prizes
      .map((p, i) => ({ p, i }))
      .sort((a, b) => dir * (a.p.rank - b.p.rank) || a.i - b.i)
      .map((x) => x.p.id);
    state = { key: data.key, order, current: 0, results: {}, showSummary: false };
    save();
  }
  function restoreOrCreateState() {
    const saved = L.store.loadState();
    if (saved && saved.key === data.key && Array.isArray(saved.order)) state = saved;
    else createState();
  }
  const save = () => L.store.saveState(state);
  const currentPrize = () => data.byId[state.order[state.current]];
  const resultOf = (id) => (id === spinningPrizeId ? undefined : state.results[id]);
  const isLast = () => state.current >= state.order.length - 1;
  const anyResults = () => Object.keys(state.results).length > 0;
  function eligible() {
    const won = new Set(Object.values(state.results).map((r) => r.nameIndex));
    return data.names.map((_, i) => i).filter((i) => !won.has(i));
  }

  /* =====================================================================
   * Wheel preparation & drawing
   * ===================================================================== */
  function prepareWheel() {
    const res = state.results[currentPrize().id];
    let pool = eligible();
    if (res && res.nameIndex != null) pool.push(res.nameIndex); // keep the winner visible after a reload
    pool = L.fx.shuffle(pool);
    wheelPool = pool;
    wheel.setItems(pool.map((i) => data.names[i]));
    if (res && res.nameIndex != null) {
      wheel.p = pool.indexOf(res.nameIndex);
      wheel.highlight = 1;
    }
  }

  async function spin() {
    if (busy) return;
    const prize = currentPrize();
    if (state.results[prize.id]) return;
    if (!wheelPool.length) {
      state.results[prize.id] = { nameIndex: null, name: null };
      save();
      render();
      return;
    }
    busy = true;
    L.fx.sound.ensure();
    const pos = L.fx.randomInt(wheelPool.length);
    const nameIndex = wheelPool[pos];
    // Commit BEFORE the animation, so refreshing the page mid-spin cannot re-roll the result.
    state.results[prize.id] = { nameIndex, name: data.names[nameIndex] };
    spinningPrizeId = prize.id;
    save();
    document.body.classList.add('is-spinning');
    render();

    await wheel.spinTo(pos);

    wheel.highlight = 0.01;
    document.body.classList.remove('is-spinning');
    L.fx.sound.fanfare();
    const wrap = $('wheel-wrap').getBoundingClientRect();
    if (cfg.confetti) L.fx.confetti.burst(wrap.left + wrap.width / 2, wrap.top + wrap.height / 2);
    await sleep(600);

    const from = prefs.style === 'pie'
      ? $('readout').getBoundingClientRect()
      : { left: wrap.left, top: wrap.top + wrap.height / 2 - 30, width: wrap.width, height: 60 };
    await L.fx.flyText(data.names[nameIndex], from, $('winner-name'), cfg.flyAnimationMs);

    spinningPrizeId = null;
    busy = false;
    render();
    const slot = $('winner-slot');
    slot.classList.remove('pop'); void slot.offsetWidth; slot.classList.add('pop');
    if (cfg.confetti) {
      const r = slot.getBoundingClientRect();
      L.fx.confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 70);
    }
    if (isLast() && cfg.autoSummaryDelayMs != null) setTimeout(openSummary, cfg.autoSummaryDelayMs);
  }

  function mainAction() {
    if (busy || !data) return;
    if (!state.results[currentPrize().id]) return spin();
    if (isLast()) return openSummary();
    state.current++;
    save();
    prepareWheel();
    render(true);
    if (cfg.spinOnNext) spin();
  }

  /* =====================================================================
   * Rendering
   * ===================================================================== */
  function setImage(img, url) {
    const box = img.parentElement;
    box.classList.toggle('no-image', !url);
    img.onerror = () => box.classList.add('no-image');
    if (url && img.getAttribute('src') !== url) img.src = url;
    if (!url) img.removeAttribute('src');
  }

  function render(animatePrize) {
    const prize = currentPrize();
    const res = resultOf(prize.id);

    $('progress').textContent = T.progress(state.current + 1, state.order.length);

    // prize card
    $('prize-rank').textContent = T.rank(prize.rank);
    $('prize-name').textContent = prize.name;
    $('prize-desc').textContent = prize.description;
    setImage($('prize-image'), prize.imageUrl);
    if (animatePrize) {
      const card = $('prize-card');
      card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
    }

    // winner slot
    const slot = $('winner-slot');
    slot.classList.toggle('has-winner', !!(res && res.name));
    slot.classList.toggle('no-winner', !!(res && !res.name));
    $('winner-name').textContent = res ? res.name || T.noWinner : T.pending;

    // results list
    const list = $('results-list');
    list.innerHTML = '';
    state.order.forEach((id, i) => {
      const p = data.byId[id];
      const r = resultOf(id);
      const li = document.createElement('li');
      li.className = i === state.current ? 'current' : r ? 'done' : 'upcoming';
      li.innerHTML = '<span class="badge"></span><span class="r-body"><span class="r-prize"></span><span class="r-winner"></span></span>';
      li.querySelector('.badge').textContent = p.rank;
      li.querySelector('.r-prize').textContent = p.name;
      li.querySelector('.r-winner').textContent = r ? r.name || '—' : '';
      list.appendChild(li);
    });
    const cur = list.children[state.current];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // pool & button
    const elig = eligible().length + (spinningPrizeId ? 1 : 0);
    $('pool-info').textContent = T.pool(elig, data.names.length);
    const btn = $('main-btn');
    if (spinningPrizeId) btn.textContent = T.spinning;
    else if (!res) btn.textContent = T.spin;
    else if (isLast()) btn.textContent = T.showSummary;
    else btn.textContent = cfg.spinOnNext ? T.next : T.showNext;
    btn.disabled = busy;

    document.body.dataset.wheel = prefs.style;
    updateReadout();
  }

  function updateReadout() {
    const i = wheel.currentIndex();
    $('readout').textContent = i >= 0 ? wheel.items[i] : '';
  }

  /* =====================================================================
   * Summary
   * ===================================================================== */
  function openSummary() {
    if (!data) return;
    state.showSummary = true;
    save();
    const grid = $('summary-grid');
    grid.innerHTML = '';
    data.prizes.slice().sort((a, b) => a.rank - b.rank).forEach((p, i) => {
      const r = state.results[p.id];
      const card = document.createElement('article');
      card.style.setProperty('--i', i);
      card.className = 'summary-card' + (p.rank === 1 ? ' first' : '');
      card.innerHTML = '<div class="s-img"><img alt=""></div><div class="s-rank"></div><div class="s-prize"></div><div class="s-winner"></div>';
      setImage(card.querySelector('img'), p.imageUrl);
      card.querySelector('.s-rank').textContent = T.rank(p.rank);
      card.querySelector('.s-prize').textContent = p.name;
      card.querySelector('.s-winner').textContent = r ? r.name || '—' : T.pending;
      grid.appendChild(card);
    });
    $('summary').hidden = false;
    if (cfg.confetti) L.fx.confetti.burst(innerWidth / 2, innerHeight / 3, 220);
  }
  function closeSummary() {
    state.showSummary = false;
    save();
    $('summary').hidden = true;
  }
  function exportCsv() {
    const rows = [['rank', 'prize', 'winner']];
    data.prizes.slice().sort((a, b) => a.rank - b.rank).forEach((p) => {
      const r = state.results[p.id];
      rows.push([p.rank, p.name, r ? r.name || '' : '']);
    });
    const blob = new Blob([L.csv.stringify(rows, cfg.csv.exportDelimiter)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lottery-results.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* =====================================================================
   * Reset / confirm
   * ===================================================================== */
  function confirmDialog(text, okLabel) {
    const dlg = $('confirm-dialog');
    $('confirm-text').textContent = text;
    $('confirm-ok').textContent = okLabel || 'Yes, reset';
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((resolve) => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true }));
  }
  async function resetLottery() {
    if (busy || !data) return;
    if (!(await confirmDialog(T.resetQuestion))) return;
    $('summary').hidden = true;
    createState();
    prepareWheel();
    render(true);
  }

  /* =====================================================================
   * Settings dialog
   * ===================================================================== */
  function openSettings() {
    $('data-status').textContent = data
      ? `${data.source === 'demo' ? 'Demo data' : 'Uploaded data'}: ${data.names.length} names, ${data.prizes.length} prizes.`
      : T.loadError;
    const warn = $('data-warnings');
    warn.innerHTML = '';
    (data ? data.warnings : []).forEach((w) => {
      const li = document.createElement('li');
      li.textContent = w;
      warn.appendChild(li);
    });
    $('opt-style').value = prefs.style;
    $('opt-order').value = prefs.drawOrder;
    $('opt-sound').checked = prefs.sound;
    const locked = !!(state && anyResults());
    $('opt-order').disabled = locked;
    $('order-locked').hidden = !locked;
    $('load-error').textContent = '';
    $('settings-dialog').showModal();
  }

  async function loadFiles() {
    const err = $('load-error');
    err.textContent = '';
    try {
      const nf = $('file-names').files[0];
      const pf = $('file-prizes').files[0];
      const imgs = [...$('file-images').files];
      if (!nf && !pf && !imgs.length) throw new Error('Choose at least one file.');
      const warnings = [];
      let namesText = data && data.namesText, prizesText = data && data.prizesText;
      if (nf) { const d = await L.csv.readFile(nf); namesText = d.text; warnings.push(...encodingWarning('Names file', d)); }
      if (pf) { const d = await L.csv.readFile(pf); prizesText = d.text; warnings.push(...encodingWarning('Prizes file', d)); }
      if (!namesText) throw new Error('Please choose a names CSV.');
      if (!prizesText) throw new Error('Please choose a prizes CSV.');
      L.csv.parseNames(namesText, cfg); // validate (throws with a readable message)
      L.csv.parsePrizes(prizesText, cfg);
      const images = imgs.length ? imgs : (data && data.source === 'upload' ? data.images : []);
      if (state && anyResults() && !(await confirmDialog('Loading new data resets the lottery. Continue?', 'Load & reset'))) return;
      await L.store.setUpload({ namesText, prizesText, images, warnings });
      L.store.clearState();
      location.reload();
    } catch (e) {
      err.textContent = e.message;
    }
  }

  async function restoreDemo() {
    if (state && anyResults() && !(await confirmDialog('Switch back to the demo data? This resets the lottery.', 'Switch & reset'))) return;
    await L.store.clearUpload();
    L.store.clearState();
    location.reload();
  }

  /* =====================================================================
   * Misc UI
   * ===================================================================== */
  function updateSoundBtn() {
    $('btn-sound').textContent = prefs.sound ? '🔊' : '🔇';
    L.fx.sound.enabled = prefs.sound;
  }
  function toggleSound() {
    prefs.sound = !prefs.sound;
    L.store.savePrefs(prefs);
    updateSoundBtn();
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  function bindEvents() {
    $('main-btn').addEventListener('click', mainAction);
    $('btn-reset').addEventListener('click', resetLottery);
    $('btn-summary-reset').addEventListener('click', resetLottery);
    $('btn-summary-close').addEventListener('click', closeSummary);
    $('btn-export').addEventListener('click', exportCsv);
    $('btn-print').addEventListener('click', () => window.print());
    $('btn-sound').addEventListener('click', toggleSound);
    $('btn-fullscreen').addEventListener('click', toggleFullscreen);
    $('btn-settings').addEventListener('click', openSettings);
    $('btn-load-files').addEventListener('click', loadFiles);
    $('btn-demo-data').addEventListener('click', restoreDemo);
    $('opt-style').addEventListener('change', (e) => {
      prefs.style = e.target.value;
      L.store.savePrefs(prefs);
      wheel.setStyle(prefs.style);
      if (data) render();
    });
    $('opt-sound').addEventListener('change', (e) => {
      prefs.sound = e.target.checked;
      L.store.savePrefs(prefs);
      updateSoundBtn();
    });
    $('opt-order').addEventListener('change', (e) => {
      prefs.drawOrder = e.target.value;
      L.store.savePrefs(prefs);
      if (data && !anyResults()) { createState(); prepareWheel(); render(true); }
    });
    // Remove focus from toolbar buttons so Space/Enter always drive the lottery.
    document.querySelectorAll('.toolbar button').forEach((b) => b.addEventListener('click', () => b.blur()));

    document.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]') || e.target.closest('input, select, textarea')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Space / Enter / → / PageDown (presentation clickers) = main button
      if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        if ($('summary').hidden) mainAction();
      } else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'm' || e.key === 'M') toggleSound();
      else if (e.key === 'Escape' && !$('summary').hidden) closeSummary();
    });
  }

  /* =====================================================================
   * Boot
   * ===================================================================== */
  async function init() {
    document.title = cfg.title;
    $('title').textContent = cfg.title;
    $('subtitle').textContent = cfg.subtitle || '';
    if (cfg.logoUrl) {
      ['logo', 'summary-logo'].forEach((id) => { $(id).src = cfg.logoUrl; $(id).hidden = false; });
    }
    document.querySelectorAll('[data-text]').forEach((el) => { el.textContent = T[el.dataset.text]; });
    $('opt-style').innerHTML = L.wheelStyles.map((s) => `<option value="${s}">${s}</option>`).join('');

    L.theme.read();
    L.fx.confetti.init($('confetti'));
    wheel = new L.Wheel($('wheel'), Object.assign({}, cfg.wheel, { style: prefs.style }));
    wheel.onIndexChange = (i, spinning) => {
      if (spinning) L.fx.sound.tick();
      updateReadout();
    };
    updateSoundBtn();
    bindEvents();

    try {
      data = await loadData();
    } catch (e) {
      console.error(e);
      document.body.classList.add('load-failed');
      $('prize-name').textContent = T.loadError;
      $('prize-rank').textContent = '';
      $('main-btn').textContent = T.spin;
      $('main-btn').disabled = true;
      openSettings();
      $('load-error').textContent = location.protocol === 'file:'
        ? 'The page was opened from disk, so the browser blocks reading data/*.csv. Upload the files here (or run a local web server).'
        : e.message;
      return;
    }
    if (data.warnings.length) console.warn('Data warnings:', data.warnings);
    restoreOrCreateState();
    prepareWheel();
    render(true);
    if (state.showSummary) openSummary();
  }

  init();
})();
