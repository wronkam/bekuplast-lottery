/* Visual & audio effects: sound, confetti, "flying name" animation, fair random numbers. */
(function (L) {
  'use strict';

  /* ---------- Fair random integer in [0, n) using crypto ---------- */
  function randomInt(n) {
    if (n <= 1) return 0;
    const max = Math.floor(0x100000000 / n) * n; // rejection sampling -> no modulo bias
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= max);
    return buf[0] % n;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- Sound (WebAudio, no files needed) ---------- */
  const sound = {
    enabled: true,
    ctx: null,
    lastTick: 0,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, start, dur, vol = 0.15, type = 'triangle') {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    },
    tick() {
      if (!this.enabled || !this.ensure()) return;
      const now = this.ctx.currentTime;
      if (now - this.lastTick < 0.035) return;
      this.lastTick = now;
      this.tone(1500 + Math.random() * 200, now, 0.035, 0.08, 'square');
    },
    fanfare() {
      if (!this.enabled || !this.ensure()) return;
      const t = this.ctx.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.9 : 0.25, 0.18));
      [659.25, 783.99, 1046.5].forEach((f) => this.tone(f, t + 0.44, 0.9, 0.08, 'sine'));
    },
  };

  /* ---------- Confetti ---------- */
  const confetti = (() => {
    let canvas, ctx, parts = [], running = false;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return {
      init(el) {
        canvas = el; ctx = el.getContext('2d');
        resize(); addEventListener('resize', resize);
      },
      burst(x, y, count = 180) {
        if (!ctx) return;
        const colors = L.theme.palette;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 4 + Math.random() * 11;
          parts.push({
            x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
            w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
            rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
            color: colors[i % colors.length], life: 140 + Math.random() * 80,
          });
        }
        if (!running) { running = true; requestAnimationFrame(frame); }
      },
    };
  })();

  /* ---------- Fly a text label from one element to another ---------- */
  function flyText(text, fromRect, toEl, duration) {
    const toRect = toEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flying-name';
    el.textContent = text;
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    const fx = fromRect.left + fromRect.width / 2 - w / 2;
    const fy = fromRect.top + fromRect.height / 2 - h / 2;
    const tx = toRect.left + toRect.width / 2 - w / 2;
    const ty = toRect.top + toRect.height / 2 - h / 2;
    const midX = (fx + tx) / 2, midY = Math.min(fy, ty) - 80; // arc upwards
    const anim = el.animate(
      [
        { transform: `translate(${fx}px, ${fy}px) scale(1)`, opacity: 1 },
        { transform: `translate(${midX}px, ${midY}px) scale(1.35)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${tx}px, ${ty}px) scale(1)`, opacity: 1 },
      ],
      { duration, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' },
    );
    return anim.finished.then(() => el.remove(), () => el.remove());
  }

  /* Read theme colours from CSS custom properties so the canvas follows the stylesheet. */
  L.theme = {
    palette: [],
    read() {
      const cs = getComputedStyle(document.documentElement);
      const v = (n) => cs.getPropertyValue(n).trim();
      // Fallbacks keep the canvas working even if a theme forgets a variable or fails to load.
      this.palette = v('--palette').split(',').map((s) => s.trim()).filter(Boolean);
      if (!this.palette.length) this.palette = ['#3366cc', '#f2a541', '#2bb3a3', '#e05d5d'];
      this.text = v('--text') || '#333333';
      this.accent = v('--accent') || '#3366cc';
      this.wheelBg = v('--wheel-bg') || '#e6e9f0';
      this.wheelBg2 = v('--wheel-bg-2') || '#ffffff';
      this.wheelRim = v('--wheel-rim') || this.wheelBg2;
      this.wheelHub = v('--wheel-hub') || this.wheelBg;
      const num = (n, d) => (Number.isFinite(parseFloat(v(n))) ? parseFloat(v(n)) : d);
      this.hueStart = num('--wheel-hue-start', 0);
      this.hueSpan = num('--wheel-hue-span', 360);
      this.hueMirror = num('--wheel-hue-mirror', 0) === 1;
      this.manyMode = v('--wheel-many') || 'sweep';   // 'sweep' | 'blocks'
      this.blocks = num('--wheel-blocks', 12);
      this.sat = v('--wheel-sat') || '70%';
      this.light = v('--wheel-light') || '55%';
      this.lightAlt = v('--wheel-light-alt') || this.light;
      this.wheelShade = v('--wheel-shade') || 'rgba(0,0,0,0.5)';
      this.radius = parseFloat(v('--wheel-radius')) || 0;
      this.font = v('--font') || 'system-ui, sans-serif';
    },
  };

  L.fx = { randomInt, shuffle, sound, confetti, flyText };
})((window.Lottery = window.Lottery || {}));
