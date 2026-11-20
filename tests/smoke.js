/*
 * Smoke test – run after every change:   node tests/smoke.js
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
 * locally; it is pre-installed in Claude Code cloud sessions).
 * Starts its own static server, speeds the wheel up, and checks:
 *   - start screen first (image only by default, switchable), then a full draw (two presses per prize) with unique winners, no JS errors
 *   - prize list hidden by default + Settings switch, hide/show top bar, every summary card bordered
 *   - the bundled brand font loads (bekuplast themes)
 *   - every winner sound renders real audio; own start image / own sound pickers work and persist
 *   - progress survives a reload, reset works
 *   - every theme in js/config.js loads its stylesheet and sets the CSS variables
 *   - every language has the same keys as English and switches the UI
 *   - the top bar never overlaps / scrolls sideways at common widths
 * Exit code 0 = all good, 1 = something failed (details printed).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ok ' : 'FAIL '} ${msg}`); if (!cond) failures++; };

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const newPage = async (viewport = { width: 1600, height: 900 }) => {
    const p = await browser.newPage({ viewport });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.route('https://fonts.googleapis.com/**', (r) => r.abort()); // offline-safe
    await p.route('**/js/config.js', async (r) => {               // fast spins for testing
      const body = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8')
        .replace(/durationMs: \d+/, 'durationMs: 600').replace(/durationJitterMs: \d+/, 'durationJitterMs: 0')
        .replace(/flyAnimationMs: \d+/, 'flyAnimationMs: 100').replace(/windUpMs: \d+/, 'windUpMs: 0');
      r.fulfill({ contentType: 'text/javascript', body });
    });
    return p;
  };
  const cfg = await (async () => { const p = await newPage(); await p.goto(base); const c = await p.evaluate(() => ({
    themes: Object.keys(window.LOTTERY_CONFIG.themes), langs: Object.keys(window.LOTTERY_I18N) })); await p.close(); return c; })();

  console.log('Full draw');
  {
    const p = await newPage();
    await p.goto(base); await p.waitForTimeout(300);
    const prizes = await p.$$eval('#results-list li', (l) => l.length);
    const startImg = await p.evaluate(() => window.LOTTERY_CONFIG.startImage);
    if (startImg) {
      const intro = await p.evaluate(() => ({ intro: document.body.classList.contains('intro'),
        btn: document.getElementById('main-btn').textContent, begin: window.LOTTERY_I18N.en.begin,
        img: document.getElementById('prize-image').getAttribute('src') }));
      ok(intro.intro && intro.btn === intro.begin && !!intro.img, `start screen first (${intro.img})`);
      const wheelShown = () => p.isVisible('#wheel-wrap');
      ok(!(await wheelShown()) && (await p.isVisible('#main-btn')), 'start screen shows only the image panel + Start button');
      await p.click('#btn-settings'); await p.uncheck('#opt-intro-only'); await p.click('#settings-form button[value=close]');
      const off = await wheelShown();
      await p.click('#btn-settings'); await p.check('#opt-intro-only'); await p.click('#settings-form button[value=close]');
      ok(off && !(await wheelShown()), 'Settings switch shows / hides the name wheel on the start screen');
      await p.click('#main-btn'); await p.waitForTimeout(150);
      ok(await wheelShown(), 'name wheel appears with the first prize');
      const first = await p.evaluate(() => [document.body.classList.contains('intro'), document.body.classList.contains('is-spinning'),
        document.getElementById('main-btn').textContent]);
      ok(!first[0] && !first[1] && first[2] === 'Spin!', 'first press shows prize 1 without spinning');
    }
    ok(await p.isHidden('.results-panel'), 'prize list hidden by default');
    await p.click('#btn-settings'); await p.check('#opt-list'); await p.click('#settings-form button[value=close]');
    ok(await p.isVisible('.results-panel'), 'Settings switch shows the prize list');
    await p.click('#btn-hide-topbar');
    ok((await p.isHidden('#topbar')) && (await p.isVisible('#btn-show-topbar')), 'top bar hides, reveal button appears');
    await p.click('#btn-show-topbar');
    ok((await p.isVisible('#topbar')) && (await p.isHidden('#btn-show-topbar')), 'top bar comes back');
    for (let i = 0; i < prizes * 2 + 4; i++) {
      if ((await p.textContent('#main-btn')).includes('🏆')) break;
      await p.click('#main-btn');
      await p.waitForFunction(() => !document.getElementById('main-btn').disabled, null, { timeout: 15000 });
    }
    const pending = await p.$$eval('.r-winner', (w) => w.filter((x) => !x.textContent).length);
    ok(pending === 0, `all ${prizes} prizes drawn`);
    await p.reload(); await p.waitForTimeout(300);
    const after = await p.$$eval('.r-winner', (w) => w.map((x) => x.textContent));
    ok(after.every(Boolean) && new Set(after).size === after.length, 'winners unique and kept after reload');
    await p.click('#main-btn'); await p.waitForTimeout(300);
    ok(await p.isVisible('#summary'), 'summary opens after the last prize');
    const borders = await p.$$eval('.summary-card', (cards) => {
      return cards.map((c) => getComputedStyle(c).borderLeftColor);
    });
    ok(borders.length === prizes && new Set(borders).size === 1, `every summary card has the same border (${borders[0]})`);
    await p.click('#btn-summary-reset'); await p.click('#confirm-ok'); await p.waitForTimeout(200);
    ok((await p.$$eval('.r-winner', (w) => w.filter((x) => x.textContent).length)) === 0, 'reset clears results');
    await p.close();
  }

  console.log('Sounds & Settings files');
  {
    const p = await newPage();
    await p.goto(base); await p.waitForTimeout(300);
    // render every synthesised winner sound offline and check it is audible and does not clip
    const stats = await p.evaluate(async () => {
      const out = {};
      for (const name of window.Lottery.fx.winSounds) {
        const sr = 22050, ctx = new OfflineAudioContext(1, sr * 4, sr);
        const s = window.Lottery.fx.sound, saved = [s.ctx, s.out, s.ensure, s.noiseBuf];
        s.ctx = ctx; s.out = ctx.destination; s.ensure = () => ctx; s.noiseBuf = null;
        s.win(name, true);
        const d = (await ctx.startRendering()).getChannelData(0);
        [s.ctx, s.out, s.ensure, s.noiseBuf] = saved;
        let peak = 0; for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        out[name] = +peak.toFixed(2);
      }
      return out;
    });
    Object.entries(stats).forEach(([n, peak]) => ok(peak > 0.05 && peak < 1, `sound ${n}: peak ${peak}`));
    const labels = await p.evaluate(() => window.Lottery.fx.winSounds.every((k) =>
      Object.keys(window.LOTTERY_I18N).every((l) => typeof window.LOTTERY_I18N[l]['sound_' + k] === 'string')));
    ok(labels, 'every winner sound has a label in every language');

    // own start image (applied at once, kept after reload, default restorable)
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><rect width="40" height="30" fill="red"/></svg>';
    await p.click('#btn-settings');
    await p.setInputFiles('#file-start', { name: 'mine.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
    await p.waitForTimeout(200);
    ok((await p.getAttribute('#prize-image', 'src')).startsWith('blob:'), 'own start image shows at once');
    // own winner sound: a 0.3 s WAV made here
    const sr = 8000, n = sr * 0.3, wav = Buffer.alloc(44 + n * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * 440 * i / sr)), 44 + i * 2);
    await p.selectOption('#opt-win-sound', 'custom');
    await p.setInputFiles('#file-win-sound', { name: 'ding.wav', mimeType: 'audio/wav', buffer: wav });
    await p.waitForTimeout(300);
    await p.click('#settings-form button[value=close]');
    await p.reload(); await p.waitForTimeout(500);
    const kept = await p.evaluate(() => [document.getElementById('prize-image').getAttribute('src').slice(0, 5),
      document.getElementById('opt-win-sound').value, !!window.Lottery.fx.sound.customBuffer]);
    ok(kept[0] === 'blob:' && kept[1] === 'custom' && kept[2], 'own start image and own sound kept after reload');
    await p.click('#btn-settings'); await p.click('#btn-start-default'); await p.waitForTimeout(200);
    const startImg = await p.evaluate(() => window.LOTTERY_CONFIG.startImage);
    ok((await p.getAttribute('#prize-image', 'src')) === startImg, '"Use default image" restores the start image');
    await p.close();
  }

  console.log('Themes');
  for (const t of cfg.themes) {
    const p = await newPage();
    await p.goto(`${base}?theme=${t}`); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      href: document.getElementById('theme-css').getAttribute('href'),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      wheel: getComputedStyle(document.documentElement).getPropertyValue('--wheel-bg').trim(),
      sheetLoaded: [...document.styleSheets].some((s) => s.ownerNode && s.ownerNode.id === 'theme-css' && s.cssRules.length > 0),
    }));
    ok(r.theme === t && r.sheetLoaded && r.accent && r.wheel, `${t}: stylesheet ${r.href} loaded, --accent=${r.accent}`);
    const font = await p.evaluate(async () => {
      const fam = getComputedStyle(document.body).fontFamily;
      if (!fam.includes('Brand Font')) return 'not used';
      await document.fonts.ready;
      return [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Brand Font' && f.status === 'loaded') ? 'loaded' : 'MISSING';
    });
    ok(font !== 'MISSING', `${t}: brand font ${font}`);
    await p.close();
  }

  console.log('Languages');
  {
    const p = await newPage();
    await p.goto(base); await p.waitForTimeout(200);
    const diff = await p.evaluate(() => {
      const d = window.LOTTERY_I18N, en = Object.keys(d.en);
      return Object.keys(d).map((l) => [l, en.filter((k) => !(k in d[l])), Object.keys(d[l]).filter((k) => !en.includes(k))]);
    });
    diff.forEach(([l, missing, extra]) => ok(!missing.length && !extra.length, `${l}: same keys as en${missing.length ? ' missing ' + missing : ''}${extra.length ? ' extra ' + extra : ''}`));
    for (const l of cfg.langs) {
      await p.click(`#btn-lang [data-lang="${l}"]`); await p.waitForTimeout(100);
      const r = await p.evaluate(() => [document.documentElement.lang, document.querySelector('h1').textContent, document.getElementById('main-btn').textContent]);
      const exp = await p.evaluate((code) => [code, window.LOTTERY_I18N[code].title,
        window.LOTTERY_I18N[code][window.LOTTERY_CONFIG.startImage ? 'begin' : 'spin']], l);
      ok(JSON.stringify(r) === JSON.stringify(exp), `${l}: UI switched (${r[1]} / ${r[2]})`);
    }
    await p.close();
  }

  console.log('Top bar layout');
  for (const t of cfg.themes) for (const l of cfg.langs) for (const w of [390, 1024, 1366, 1920]) {
    const p = await newPage({ width: w, height: 800 });
    await p.goto(`${base}?theme=${t}&lang=${l}`); await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      const bar = document.getElementById('topbar');
      const stacked = getComputedStyle(bar).gridTemplateColumns.split(' ').length === 1;
      const br = document.querySelector('.brand').getBoundingClientRect(), tb = document.querySelector('.toolbar').getBoundingClientRect();
      return { overlap: !stacked && br.right > tb.left + 1, hscroll: document.documentElement.scrollWidth > innerWidth };
    });
    if (r.overlap || r.hscroll) ok(false, `${t}/${l}@${w}px: ${r.overlap ? 'title overlaps toolbar ' : ''}${r.hscroll ? 'horizontal scroll' : ''}`);
    await p.close();
  }
  ok(true, 'checked every theme × language × width');

  ok(errors.length === 0, `no JavaScript errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
