/*
 * Smoke test – run after every change:   node tests/smoke.js
 * Needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`
 * locally; it is pre-installed in Claude Code cloud sessions).
 * Starts its own static server, speeds the wheel up, and checks:
 *   - a full draw (two presses per prize) with unique winners, no JS errors
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
    for (let i = 0; i < prizes * 2 + 2; i++) {
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
    await p.click('#btn-summary-reset'); await p.click('#confirm-ok'); await p.waitForTimeout(200);
    ok((await p.$$eval('.r-winner', (w) => w.filter((x) => x.textContent).length)) === 0, 'reset clears results');
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
      const exp = await p.evaluate((code) => [code, window.LOTTERY_I18N[code].title, window.LOTTERY_I18N[code].spin], l);
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
