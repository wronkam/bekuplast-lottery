/*
 * The lottery wheel. Position `p` is measured in "items": the item under the pointer is round(p) mod N.
 * Two renderers share that model:
 *   - drum: a vertical reel / cylinder (readable with hundreds of names)
 *   - pie:  a classic segmented wheel with a pointer on top
 * Add a new style by adding a function to RENDERERS.
 */
(function (L) {
  'use strict';
  const TAU = Math.PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;

  class Wheel {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = opts;
      this.style = opts.style || 'drum';
      this.items = [];
      this.p = 0;
      this.speed = 0;      // items / second (for blur & lights)
      this.spinning = false;
      this.highlight = 0;  // 0..1 winner glow
      this.onIndexChange = null;
      this._lastIndex = null;
      this._lastT = performance.now();
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      this.resize();
      requestAnimationFrame((t) => this._loop(t));
    }

    setItems(items) { this.items = items.slice(); this._lastIndex = null; this.highlight = 0; }
    setStyle(style) { this.style = style; }
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
      const minTravel = this.style === 'pie' ? o.pieLaps * n : Math.max(o.minTravelItems, n);
      const base = Math.round(start);
      let end = base + mod(target - base, n);
      while (end - start < minTravel) end += n;
      if (this.style === 'pie') end += (Math.random() - 0.5) * 0.6; // land anywhere inside the segment
      const windUp = o.windUpMs;
      const back = windUp ? 0.6 : 0;
      const dur = o.durationMs + (Math.random() * 2 - 1) * o.durationJitterMs;
      const pow = o.easingPower;
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
      (RENDERERS[this.style] || RENDERERS.drum).call(this, ctx, w, h, L.theme);
    }
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
    return s + '…';
  }

  const RENDERERS = {
    /* ---------------- vertical reel ---------------- */
    drum(ctx, w, h, th) {
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
    },

    /* ---------------- classic wheel ---------------- */
    pie(ctx, w, h, th) {
      const n = this.items.length;
      const seg = TAU / n;
      const cx = w / 2;
      const R = Math.min(w, h) / 2 - 28;
      const cy = h / 2 + 14;
      const pal = th.palette;
      const winner = this.currentIndex();

      ctx.save();
      ctx.translate(cx, cy);
      // rim
      ctx.beginPath();
      ctx.arc(0, 0, R + 14, 0, TAU);
      ctx.fillStyle = th.wheelRim;
      ctx.fill();

      ctx.rotate(-Math.PI / 2 - this.p * seg);
      const labelSpace = R * seg;
      const fontSize = Math.min(22, labelSpace * 0.7);
      const showLabels = fontSize >= 9;
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, (i - 0.5) * seg, (i + 0.5) * seg);
        ctx.closePath();
        // few names: cycle the theme palette; many names: a smooth hue sweep (--wheel-hue-* variables)
        const t = th.hueMirror ? (1 - Math.cos((TAU * i) / n)) / 2 : i / n;
        const color = n <= pal.length * 3 && n % pal.length !== 1
          ? pal[i % pal.length]
          : `hsl(${th.hueStart + th.hueSpan * t}, ${th.sat}, ${i % 2 ? th.lightAlt : th.light})`;
        ctx.fillStyle = color;
        ctx.fill();
        if (!this.spinning && this.highlight && i === winner) {
          ctx.fillStyle = `rgba(255,255,255,${0.45 * this.highlight})`;
          ctx.fill();
        }
        if (n <= 60) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke(); }
        if (showLabels) {
          ctx.save();
          ctx.rotate(i * seg);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${fontSize}px ${th.font}`;
          ctx.fillStyle = '#fff';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 3;
          ctx.fillText(fitText(ctx, this.items[i], R * 0.68), R - 12, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      // light bulbs on the rim
      const bulbs = 28;
      const blink = Math.floor(performance.now() / (this.spinning ? 90 : 450)) % 2;
      for (let i = 0; i < bulbs; i++) {
        const a = (i / bulbs) * TAU;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7), 3.5, 0, TAU);
        ctx.fillStyle = (i + blink) % 2 ? th.accent : 'rgba(255,255,255,0.85)';
        ctx.fill();
      }

      // hub
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(18, R * 0.12), 0, TAU);
      ctx.fillStyle = th.wheelHub;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = th.accent;
      ctx.stroke();

      // pointer
      ctx.fillStyle = th.accent;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy - R - 26);
      ctx.lineTo(cx + 16, cy - R - 26);
      ctx.lineTo(cx, cy - R + 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    },
  };

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
  L.wheelStyles = Object.keys(RENDERERS);
})((window.Lottery = window.Lottery || {}));
