/*
 * The lottery wheel: a vertical drum / reel (readable with hundreds of names).
 * Position `p` is measured in "items": the item under the pointer is round(p) mod N.
 * Colours come from L.theme (CSS variables of the active theme).
 */
(function (L) {
  'use strict';
  const mod = (a, n) => ((a % n) + n) % n;

  class Wheel {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts;
      this.items = [];
      this.p = 0;
      this.speed = 0;      // items / second (for blur & lights)
      this.spinning = false;
      this.highlight = 0;  // 0..1 winner glow
      this.onIndexChange = null;
      this.lastSpinMs = 0; // planned length of the current/last spin (for sounds timed to the spin)
      this._lastIndex = null;
      this._lastT = performance.now();
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.resize();
      requestAnimationFrame((t) => this._loop(t));
    }

    setItems(items) { this.items = items.slice(); this._lastIndex = null; this.highlight = 0; }
    currentIndex() { return this.items.length ? mod(Math.round(this.p), this.items.length) : -1; }

    resize() {
      const r = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.w = Math.max(10, r.width);
      this.h = Math.max(10, r.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.canvas.style.width = this.w + 'px';
      this.canvas.style.height = this.h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Spin so that items[target] ends under the pointer. Resolves when the wheel stops. */
    spinTo(target) {
      const n = this.items.length;
      const o = this.opts;
      const start = this.p;
      const minTravel = Math.max(o.minTravelItems, n);
      const base = Math.round(start);
      let end = base + mod(target - base, n);
      while (end - start < minTravel) end += n;
      const windUp = o.windUpMs;
      const back = windUp ? 0.6 : 0;
      // never shorter than 0.5 s, even if the jitter is configured larger than the duration
      const dur = Math.max(500, o.durationMs + (Math.random() * 2 - 1) * o.durationJitterMs);
      const pow = o.easingPower;
      this.lastSpinMs = windUp + dur;
      this.spinning = true;
      this.highlight = 0;
      return new Promise((resolve) => {
        const t0 = performance.now();
        this._anim = (now) => {
          const t = now - t0;
          if (t < windUp) {
            this.p = start - back * Math.sin((t / windUp) * Math.PI / 2);
            return;
          }
          const k = Math.min(1, (t - windUp) / dur);
          const from = start - back;
          this.p = from + (end - from) * (1 - Math.pow(1 - k, pow));
          if (k >= 1) {
            this.p = end;
            this._anim = null;
            this.spinning = false;
            resolve(this.currentIndex());
          }
        };
      });
    }

    _loop(now) {
      const dt = Math.min(0.1, (now - this._lastT) / 1000);
      this._lastT = now;
      const prev = this.p;
      if (this._anim) this._anim(now);
      else if (!this.highlight && this.items.length > 1) this.p += this.opts.idleSpeed * dt;
      if (this.highlight && this.highlight < 1) this.highlight = Math.min(1, this.highlight + dt * 2);
      this.speed = dt ? Math.abs(this.p - prev) / dt : 0;
      const idx = this.currentIndex();
      if (idx !== this._lastIndex) {
        this._lastIndex = idx;
        if (this.onIndexChange) this.onIndexChange(idx, this.spinning);
      }
      this.draw();
      requestAnimationFrame((t) => this._loop(t));
    }

    draw() {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      if (!this.items.length) return;
      drawDrum.call(this, ctx, w, h, L.theme);
    }
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
    return s + '…';
  }

  /* ---------------- the drum (vertical reel) ---------------- */
  function drawDrum(ctx, w, h, th) {
    const n = this.items.length;
    const visible = this.opts.drumVisibleItems;
    const step = Math.PI / visible;
    const R = h / 2;
    const cy = h / 2;
    const rowH = R * Math.sin(step) * 1.05;
    const base = Math.floor(this.p);
    const frac = this.p - base;
    const half = Math.ceil(visible / 2) + 1;

    // drum body
    const body = ctx.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, th.wheelBg);
    body.addColorStop(0.5, th.wheelBg2);
    body.addColorStop(1, th.wheelBg);
    ctx.fillStyle = body;
    roundRect(ctx, 0, 0, w, h, th.radius);
    ctx.fill();

    // centre band
    const bandH = rowH * 1.15;
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.25 * this.highlight;
    ctx.fillStyle = th.accent;
    ctx.fillRect(0, cy - bandH / 2, w, bandH);
    ctx.restore();

    const blur = Math.min(4, Math.max(0, (this.speed - 15) / 40));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let d = -half; d <= half; d++) {
      const offset = d - frac;
      const a = offset * step;
      if (Math.abs(a) >= Math.PI / 2) continue;
      const name = this.items[mod(base + d, n)];
      const scale = Math.cos(a);
      const y = cy + R * Math.sin(a);
      const isCenter = Math.abs(offset) < 0.5;
      const size = Math.min(rowH * 0.62, w / 14);
      ctx.save();
      ctx.translate(w / 2, y);
      ctx.scale(1, scale);
      ctx.globalAlpha = 0.15 + 0.85 * scale * scale;
      if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      const glow = isCenter && !this.spinning ? this.highlight : 0;
      ctx.font = `${isCenter ? 800 : 600} ${size * (1 + glow * 0.12)}px ${th.font}`;
      ctx.fillStyle = isCenter ? th.accent : th.text;
      if (glow) { ctx.shadowColor = th.accent; ctx.shadowBlur = 25 * glow; }
      ctx.fillText(fitText(ctx, name, w * 0.84), 0, 0);
      ctx.restore();
    }

    // top / bottom shading for depth
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, th.wheelShade);
    shade.addColorStop(0.28, 'rgba(255,255,255,0)');
    shade.addColorStop(0.72, 'rgba(255,255,255,0)');
    shade.addColorStop(1, th.wheelShade);
    ctx.fillStyle = shade;
    roundRect(ctx, 0, 0, w, h, th.radius);
    ctx.fill();

    // pointers
    ctx.fillStyle = th.accent;
    const ps = Math.max(12, rowH * 0.35);
    triangle(ctx, 4, cy, ps, 1);
    triangle(ctx, w - 4, cy, ps, -1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function triangle(ctx, x, y, s, dir) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + dir * s * 1.2, y);
    ctx.lineTo(x, y + s);
    ctx.closePath();
    ctx.fill();
  }

  L.Wheel = Wheel;
})((window.Lottery = window.Lottery || {}));
