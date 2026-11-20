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

  /* ---------- Sound (WebAudio, synthesised – no audio files needed, works offline) ---------- */
  // Note frequencies (Hz) used by the melodies below.
  const N = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25,
    F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568.0, C7: 2093.0 };

  const sound = {
    enabled: true,
    ctx: null,
    out: null,          // master gain -> compressor -> speakers
    lastTick: 0,
    noiseBuf: null,
    customBuffer: null, // decoded "Own file…" sound (AudioBuffer)
    customMaxSec: 8,
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        const comp = this.ctx.createDynamicsCompressor();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.9;
        this.out.connect(comp).connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    /** One oscillator note with an exponential decay. */
    tone(freq, start, dur, vol = 0.15, type = 'triangle', dest) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(dest || this.out);
      o.start(start);
      o.stop(start + dur + 0.05);
    },
    /** Bell: a few inharmonic sine partials with long, staggered decays. */
    bell(freq, start, dur = 2, vol = 0.12) {
      [[0.5, 0.35], [1, 1], [1.19, 0.3], [1.5, 0.35], [2, 0.5], [2.74, 0.25], [3.76, 0.12], [5.4, 0.08]]
        .forEach(([r, a], i) => this.tone(freq * r, start, dur * (1 - i * 0.09), vol * a, 'sine'));
    },
    /** Short burst of filtered white noise (claps, sleigh-bell shimmer). */
    noise(start, dur, vol, freq, q = 1, type = 'bandpass') {
      const ctx = this.ctx;
      if (!this.noiseBuf) {
        this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(f).connect(g).connect(this.out);
      src.start(start, Math.random() * 0.5);
      src.stop(start + dur + 0.05);
    },
    /** One "shake" of sleigh bells: several tiny jingles. */
    jingle(start, vol = 0.1) {
      for (let i = 0; i < 6; i++) {
        const t = start + Math.random() * 0.06;
        this.noise(t, 0.12, vol, 6500 + Math.random() * 3000, 8);
        this.tone(3800 + Math.random() * 2200, t, 0.09, vol * 0.25, 'sine');
      }
    },
    tick() {
      if (!this.enabled || !this.ensure()) return;
      const now = this.ctx.currentTime;
      if (now - this.lastTick < 0.035) return;
      this.lastTick = now;
      this.tone(1500 + Math.random() * 200, now, 0.035, 0.08, 'square');
    },
    /** Play the winner sound `name` (a key of WIN_SOUNDS, or 'custom'). */
    win(name, force) { // force = play even when sounds are switched off (Settings preview)
      if ((!this.enabled && !force) || !this.ensure()) return;
      const t = this.ctx.currentTime + 0.03;
      if (name === 'custom') return this.playCustom(t);
      (WIN_SOUNDS[name] || WIN_SOUNDS.fanfare).call(this, t);
    },
    /** Decode an uploaded audio file (Blob/File) for the "Own file…" option. */
    async setCustom(blob) {
      this.customBuffer = null;
      if (!blob) return;
      // An OfflineAudioContext decodes without needing a user gesture; AudioBuffers work in any context.
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return;
      const buf = await blob.arrayBuffer();
      const dec = new OAC(1, 1, 44100);
      this.customBuffer = await new Promise((res, rej) => dec.decodeAudioData(buf, res, rej));
    },
    playCustom(t) {
      if (!this.customBuffer) return WIN_SOUNDS.fanfare.call(this, t);
      const src = this.ctx.createBufferSource();
      src.buffer = this.customBuffer;
      const g = this.ctx.createGain();
      const len = Math.min(this.customBuffer.duration, this.customMaxSec);
      g.gain.setValueAtTime(1, t);
      g.gain.setValueAtTime(1, t + Math.max(0, len - 0.6));
      g.gain.linearRampToValueAtTime(0.0001, t + len); // long files fade out after customMaxSec
      src.connect(g).connect(this.out);
      src.start(t);
      src.stop(t + len + 0.05);
    },
  };

  /*
   * Winner sounds. Each is called with `this` = sound and t = start time (seconds).
   * Add one: put a function here and an i18n label `sound_<key>` in every language.
   * Keys starting with "xmas_" are listed as the Christmas options.
   */
  const WIN_SOUNDS = {
    fanfare(t) {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.9 : 0.25, 0.18));
      [N.E5, N.G5, N.C6].forEach((f) => this.tone(f, t + 0.44, 0.9, 0.08, 'sine'));
    },
    tada(t) {
      // brassy "ta-DAA": short pickup, then a held major chord with a little vibrato
      const brass = (f, s, d, v) => {
        const o = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = f;
        lfo.frequency.value = 5.5; lg.gain.value = f * 0.006; lfo.connect(lg).connect(o.frequency);
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, s); lp.frequency.linearRampToValueAtTime(2600, s + 0.08);
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.03);
        g.gain.setValueAtTime(v, s + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
        o.connect(lp).connect(g).connect(this.out);
        o.start(s); lfo.start(s); o.stop(s + d + 0.05); lfo.stop(s + d + 0.05);
      };
      brass(N.G4, t, 0.16, 0.09);
      [N.C5, N.E5, N.G5].forEach((f) => brass(f, t + 0.18, 1.3, 0.07));
      this.noise(t + 0.18, 0.5, 0.05, 9000, 0.7, 'highpass'); // cymbal splash
    },
    chime(t) {
      [N.C6, N.E6, N.G6, N.C7, N.G6, N.C7].forEach((f, i) => this.bell(f, t + i * 0.09, i > 3 ? 1.6 : 0.8, 0.075));
    },
    applause(t) {
      // ~2.5 s of a small crowd clapping: random claps, swelling then fading
      for (let i = 0; i < 160; i++) {
        const k = Math.random();
        const at = t + k * 2.5;
        const env = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.9 + 0.1;
        this.noise(at, 0.03 + Math.random() * 0.03, 0.45 * env, 1100 + Math.random() * 1600, 1.2);
      }
    },
    xmas_bells(t) {
      // church bells: ding – dong – ding – dong (G4 / D4 / G4 / C4, long ring)
      [[N.G4, 0], [N.D4, 0.55], [N.G4, 1.1], [N.C4, 1.65]].forEach(([f, d]) => this.bell(f, t + d, 2.6, 0.11));
    },
    xmas_sleigh(t) {
      // sleigh bells shaken in rhythm, with a small bell on top
      [0, 0.25, 0.5, 0.62, 0.75, 1.0, 1.25, 1.5, 1.62, 1.75].forEach((d, i) => this.jingle(t + d, i % 4 === 0 ? 0.2 : 0.14));
      [N.G5, N.C6, N.E6].forEach((f, i) => this.bell(f, t + 1.0 + i * 0.12, 1.2, 0.035));
    },
    xmas_jinglebells(t) {
      // "Jingle Bells" (J. Pierpont, 1857 – public domain): E E E–, E E E–, E G C D E–
      const q = 0.19;
      const tune = [[N.E5, 1], [N.E5, 1], [N.E5, 2], [N.E5, 1], [N.E5, 1], [N.E5, 2],
        [N.E5, 1], [N.G5, 1], [N.C5, 1.5], [N.D5, 0.5], [N.E5, 4]];
      let at = t;
      tune.forEach(([f, len], i) => {
        this.bell(f, at, Math.max(0.6, len * q * 2.2), 0.07);
        this.tone(f, at, len * q * 1.1, 0.06, 'triangle');
        at += len * q;
      });
      for (let b = 0; b < 16; b++) this.jingle(t + b * q, b % 2 ? 0.05 : 0.08); // sleigh bells on every beat
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

  L.fx = { randomInt, shuffle, sound, confetti, flyText, winSounds: Object.keys(WIN_SOUNDS) };
})((window.Lottery = window.Lottery || {}));
