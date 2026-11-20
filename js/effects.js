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
  // Note frequencies (Hz) used by the sound sets below.
  const N = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33,
    E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568.0, A6: 1760.0, C7: 2093.0 };

  const sound = {
    enabled: true,
    ctx: null,
    out: null,          // master gain -> compressor -> speakers
    lastTick: 0,
    tickCount: 0,       // ticks in the current spin (melodic sets play one note per tick)
    noiseBuf: null,
    custom: { spin: null, win: null }, // decoded "Own files…" (AudioBuffers)
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

    /* ---- building blocks ---- */
    /** One oscillator note with an exponential decay. */
    tone(freq, start, dur, vol = 0.15, type = 'triangle') {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(this.out);
      o.start(start);
      o.stop(start + dur + 0.05);
    },
    /** Bell: a few inharmonic sine partials with long, staggered decays. */
    bell(freq, start, dur = 2, vol = 0.12) {
      [[0.5, 0.35], [1, 1], [1.19, 0.3], [1.5, 0.35], [2, 0.5], [2.74, 0.25], [3.76, 0.12], [5.4, 0.08]]
        .forEach(([r, a], i) => this.tone(freq * r, start, dur * (1 - i * 0.09), vol * a, 'sine'));
    },
    /** Short burst of filtered white noise (clicks, snare, claps, cymbals, jingles). */
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
      g.gain.exponentialRampToValueAtTime(vol, start + 0.003);
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
    applause(t, len = 2.5, vol = 0.45) {
      for (let i = 0; i < len * 64; i++) {
        const k = Math.random();
        const env = Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.9 + 0.1;
        this.noise(t + k * len, 0.03 + Math.random() * 0.03, vol * env, 1100 + Math.random() * 1600, 1.2);
      }
    },
    crash(t, vol = 0.3) { this.noise(t, 1.6, vol, 7000, 0.5, 'highpass'); this.noise(t, 0.4, vol * 0.6, 3000, 0.7); },
    brass(f, s, d, v) {
      const o = this.ctx.createOscillator(), lp = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.006; lfo.connect(lg).connect(o.frequency);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, s); lp.frequency.linearRampToValueAtTime(2600, s + 0.08);
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(v, s + 0.03);
      g.gain.setValueAtTime(v, s + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
      o.connect(lp).connect(g).connect(this.out);
      o.start(s); lfo.start(s); o.stop(s + d + 0.05); lfo.stop(s + d + 0.05);
    },

    /* ---- what the app calls ---- */
    /** The wheel starts: reset the tick counter, start any continuous sound (drum roll, own file). */
    spinStart(set, seconds, force) {
      if ((!this.enabled && !force) || !this.ensure()) return;
      this.tickCount = 0;
      this.lastTick = 0;
      const s = SOUND_SETS[set] || SOUND_SETS.classic;
      if (s.spin) s.spin.call(this, this.ctx.currentTime + 0.02, seconds);
    },
    /** A new name passed the pointer while spinning. */
    tick(set, force, at) {
      if ((!this.enabled && !force) || !this.ensure()) return;
      const s = SOUND_SETS[set] || SOUND_SETS.classic;
      if (!s.tick) return;
      const now = at || this.ctx.currentTime;
      if (now - this.lastTick < (s.gap || 0.035)) return;
      this.lastTick = now;
      s.tick.call(this, now, this.tickCount++);
    },
    /** The wheel stopped on the winner. */
    win(set, force) {
      if ((!this.enabled && !force) || !this.ensure()) return;
      const s = SOUND_SETS[set] || SOUND_SETS.classic;
      s.win.call(this, this.ctx.currentTime + 0.03);
    },
    /** Settings ▶: a 2.5 s demo spin (slowing ticks) followed by the finish. */
    preview(set) {
      if (!this.ensure()) return;
      const t0 = this.ctx.currentTime + 0.05, len = 2.4;
      this.spinStart(set, len, true);
      let at = 0, gap = 0.03;
      while (at < len - 0.1) { this.tick(set, true, t0 + at); at += gap; gap *= 1.11; }
      setTimeout(() => this.win(set, true), (len + 0.15) * 1000);
    },
    /** Decode an uploaded audio file for "Own files…" (slot 'spin' or 'win'; null clears). */
    async setCustom(slot, blob) {
      this.custom[slot] = null;
      if (!blob) return;
      // An OfflineAudioContext decodes without needing a user gesture; AudioBuffers work in any context.
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return;
      const buf = await blob.arrayBuffer();
      const dec = new OAC(1, 1, 44100);
      this.custom[slot] = await new Promise((res, rej) => dec.decodeAudioData(buf, res, rej));
    },
    /** Play an AudioBuffer from t for at most `len` s (looped if shorter and loop=true), fading out at the end. */
    playBuffer(buffer, t, len, loop) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = !!loop;
      const g = this.ctx.createGain();
      const end = t + (loop ? len : Math.min(buffer.duration, len));
      g.gain.setValueAtTime(1, t);
      g.gain.setValueAtTime(1, Math.max(t, end - 0.4));
      g.gain.linearRampToValueAtTime(0.0001, end);
      src.connect(g).connect(this.out);
      src.start(t);
      src.stop(end + 0.05);
    },
  };

  /*
   * Sound sets: what plays while the drum spins and the matching finish when it stops.
   *   spin(t, seconds) – optional, once at the start (continuous sounds such as a drum roll)
   *   tick(t, n)       – optional, each time a name passes the pointer (n = 0, 1, 2 … in this spin)
   *   gap              – minimum seconds between ticks (default 0.035)
   *   win(t)           – when the wheel stops on the winner
   * `this` is the `sound` object above. Add a set here + an i18n label `sound_<key>` in every language.
   * Keys starting with "xmas_" are listed under the Christmas group in Settings.
   */
  const JINGLE_CHORUS = [ // "Jingle Bells" (J. Pierpont, 1857 – public domain), chorus, one note per tick
    'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'G5', 'C5', 'D5', 'E5',
    'F5', 'F5', 'F5', 'F5', 'F5', 'E5', 'E5', 'E5', 'E5', 'D5', 'D5', 'E5', 'D5', 'G5'];
  const SOUND_SETS = {
    classic: { // ticking clicks -> fanfare
      tick(t) { this.tone(1500 + Math.random() * 200, t, 0.035, 0.08, 'square'); },
      win(t) {
        [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.9 : 0.25, 0.18));
        [N.E5, N.G5, N.C6].forEach((f) => this.tone(f, t + 0.44, 0.9, 0.08, 'sine'));
      },
    },
    gameshow: { // wooden ratchet of a prize wheel -> brassy ta-da + applause
      tick(t) { this.noise(t, 0.025, 0.35, 2200, 3); this.tone(180, t, 0.03, 0.12, 'triangle'); },
      win(t) {
        this.brass(N.G4, t, 0.16, 0.09);
        [N.C5, N.E5, N.G5].forEach((f) => this.brass(f, t + 0.18, 1.3, 0.07));
        this.noise(t + 0.18, 0.5, 0.05, 9000, 0.7, 'highpass');
        this.applause(t + 0.5, 2.2, 0.35);
      },
    },
    drumroll: { // snare drum roll for the whole spin (getting louder) -> cymbal crash + bass hit
      spin(t, seconds) {
        for (let at = 0; at < seconds; at += 0.042 + Math.random() * 0.01) {
          const k = at / seconds;
          this.noise(t + at, 0.07, 0.07 + 0.16 * k * k, 1800 + Math.random() * 600, 0.8);
        }
      },
      win(t) { this.crash(t, 0.22); this.tone(70, t, 0.6, 0.25, 'sine'); this.tone(110, t, 0.35, 0.12, 'triangle'); },
    },
    chime: { // glockenspiel notes up a pentatonic scale -> chime arpeggio
      gap: 0.06,
      tick(t, n) { const sc = [N.C6, N.D6, N.E6, N.G6, N.A6]; this.bell(sc[n % sc.length], t, 0.35, 0.03); },
      win(t) { [N.C6, N.E6, N.G6, N.C7, N.G6, N.C7].forEach((f, i) => this.bell(f, t + i * 0.09, i > 3 ? 1.6 : 0.8, 0.075)); },
    },
    xmas_bells: { // little tinkling bells -> church bells ding-dong
      gap: 0.06,
      tick(t) { const sc = [N.E6, N.G6, N.A6, N.C7]; this.bell(sc[Math.floor(Math.random() * sc.length)], t, 0.4, 0.025); },
      win(t) { [[N.G4, 0], [N.D4, 0.55], [N.G4, 1.1], [N.C4, 1.65]].forEach(([f, d]) => this.bell(f, t + d, 2.6, 0.11)); },
    },
    xmas_sleigh: { // sleigh bells shaken while it spins -> big sleigh-bell finish with a bell on top
      gap: 0.09,
      tick(t) { this.jingle(t, 0.09); },
      win(t) {
        [0, 0.25, 0.5, 0.62, 0.75, 1.0, 1.25, 1.5].forEach((d, i) => this.jingle(t + d, i % 4 === 0 ? 0.2 : 0.14));
        [N.G5, N.C6, N.E6].forEach((f, i) => this.bell(f, t + 0.5 + i * 0.12, 1.4, 0.04));
      },
    },
    xmas_jinglebells: { // the Jingle Bells chorus plays one note per name, slowing with the drum -> "…open sleigh!"
      gap: 0.11,
      tick(t, n) {
        const f = N[JINGLE_CHORUS[n % JINGLE_CHORUS.length]];
        this.bell(f, t, 0.5, 0.045);
        this.tone(f, t, 0.18, 0.04, 'triangle');
        if (n % 2 === 0) this.jingle(t, 0.04);
      },
      win(t) {
        const q = 0.2; // last line: "one-horse o-pen sleigh"  G G F D C–
        [[N.G5, 1], [N.G5, 1], [N.F5, 1], [N.D5, 1], [N.C5, 3]].reduce((at, [f, len]) => {
          this.bell(f, at, Math.max(0.6, len * q * 2.2), 0.07);
          this.tone(f, at, len * q * 1.1, 0.06, 'triangle');
          return at + len * q;
        }, t);
        for (let b = 0; b < 10; b++) this.jingle(t + b * q, b % 2 ? 0.06 : 0.1);
      },
    },
    custom: { // own files from Settings: one plays (looped) during the spin, the other after it
      spin(t, seconds) { if (this.custom.spin) this.playBuffer(this.custom.spin, t, seconds + 0.3, true); },
      tick(t) { if (!this.custom.spin) SOUND_SETS.classic.tick.call(this, t); },
      win(t) {
        if (this.custom.win) this.playBuffer(this.custom.win, t, this.customMaxSec, false);
        else SOUND_SETS.chime.win.call(this, t);
      },
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
      this.wheelShade = v('--wheel-shade') || 'rgba(0,0,0,0.5)';
      this.radius = parseFloat(v('--wheel-radius')) || 0;
      this.font = v('--font') || 'system-ui, sans-serif';
    },
  };

  L.fx = { randomInt, shuffle, sound, confetti, flyText, soundSets: Object.keys(SOUND_SETS) };
})((window.Lottery = window.Lottery || {}));
