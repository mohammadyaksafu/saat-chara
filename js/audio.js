/* Saat Chara — procedural sound effects and music (Web Audio, no asset files). */
(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuf = null;
  let sfxOn = true;
  let musicOn = true;
  let musicTimer = null;
  let musicStep = 0;
  let nextNoteTime = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxOn ? 0.8 : 0;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock() {
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  function now() { return ctx.currentTime; }

  function tone(freq, dur, opts) {
    if (!ctx || !sfxOn) return;
    const o = opts || {};
    const t = now() + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise(dur, opts) {
    if (!ctx || !sfxOn) return;
    const o = opts || {};
    const t = now() + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const vol = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  const sfx = {
    click() { tone(660, 0.08, { type: "triangle", vol: 0.18 }); },
    throw() { noise(0.28, { freq: 600, to: 2400, q: 2, vol: 0.35, attack: 0.03 }); },
    bounce(strength) {
      const s = Math.max(0.05, Math.min(1, strength || 0.5));
      tone(150, 0.09, { type: "sine", to: 80, vol: 0.25 * s });
    },
    clack(delay) {
      const f = 1400 + Math.random() * 1600;
      noise(0.07, { freq: f, q: 6, vol: 0.4, delay: delay || 0 });
      tone(f * 0.5, 0.06, { type: "triangle", vol: 0.12, delay: delay || 0 });
    },
    crash() {
      noise(0.5, { freq: 900, to: 300, q: 0.8, vol: 0.45 });
      for (let i = 0; i < 7; i++) sfx.clack(0.02 + i * 0.045 + Math.random() * 0.03);
    },
    pickup() { tone(520, 0.09, { type: "triangle", to: 780, vol: 0.2 }); },
    place(n) {
      const base = 330 * Math.pow(2, (n || 0) / 12 * 2);
      tone(base, 0.16, { type: "triangle", vol: 0.28 });
      noise(0.05, { freq: 2000, q: 4, vol: 0.25 });
    },
    hit() {
      tone(180, 0.22, { type: "sine", to: 60, vol: 0.5 });
      noise(0.15, { freq: 500, q: 1, vol: 0.4 });
    },
    out() { tone(440, 0.18, { type: "square", to: 220, vol: 0.12 }); },
    kick() { tone(110, 0.12, { type: "sine", to: 60, vol: 0.4 }); noise(0.06, { freq: 1200, q: 2, vol: 0.2 }); },
    catch() { tone(240, 0.08, { type: "sine", vol: 0.35 }); noise(0.05, { freq: 800, q: 2, vol: 0.2 }); },
    dash() { noise(0.18, { freq: 1500, to: 600, q: 1.5, vol: 0.22 }); },
    whistle() {
      if (!ctx || !sfxOn) return;
      const t = now();
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 2100;
      lfo.frequency.value = 28;
      lfoGain.gain.value = 120;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2200;
      f.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.setValueAtTime(0.18, t + 0.32);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(f);
      f.connect(g);
      g.connect(sfxBus);
      osc.start(t); lfo.start(t);
      osc.stop(t + 0.5); lfo.stop(t + 0.5);
    },
    cheer() {
      noise(1.4, { freq: 1800, q: 0.6, vol: 0.22, attack: 0.25 });
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => tone(f, 0.35, { type: "triangle", vol: 0.22, delay: i * 0.09 }));
    },
    groan() {
      tone(392, 0.25, { type: "triangle", vol: 0.2 });
      tone(330, 0.25, { type: "triangle", vol: 0.2, delay: 0.2 });
      tone(262, 0.5, { type: "triangle", vol: 0.2, delay: 0.4 });
    },
    tick() { tone(1200, 0.04, { type: "square", vol: 0.06 }); },
    win() {
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) =>
        tone(f, 0.3, { type: "triangle", vol: 0.25, delay: i * 0.12 }));
    },
  };

  // --- Gentle looping tune: a pentatonic folk-ish line over a soft drone. ---
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  const MELODY = [0, 2, 4, 2, 5, 4, 2, -1, 3, 4, 2, 0, 1, 2, 0, -1,
                  4, 5, 7, 5, 4, 2, 4, -1, 2, 1, 0, 1, 2, 4, 0, -1];
  const ROOT = 293.66; // D4
  const STEP = 0.26;

  function scheduleMusic() {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.4) {
      const idx = MELODY[musicStep % MELODY.length];
      if (idx >= 0) {
        const f = ROOT * Math.pow(2, SCALE[idx] / 12);
        const t = nextNoteTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.6);
        osc.connect(g); g.connect(musicBus);
        osc.start(t); osc.stop(t + STEP * 1.7);
      }
      if (musicStep % 8 === 0) {
        const t = nextNoteTime;
        const bass = ctx.createOscillator();
        const g = ctx.createGain();
        bass.type = "sine";
        bass.frequency.value = ROOT / (musicStep % 16 === 0 ? 2 : 2 * Math.pow(2, 5 / 12) / 1.5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 7);
        bass.connect(g); g.connect(musicBus);
        bass.start(t); bass.stop(t + STEP * 7.2);
      }
      if (musicStep % 2 === 0) {
        // soft hand-drum (dhol-ish) pulse
        const t = nextNoteTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(musicStep % 4 === 0 ? 110 : 165, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(musicStep % 4 === 0 ? 0.14 : 0.06, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g); g.connect(musicBus);
        o.start(t); o.stop(t + 0.2);
      }
      nextNoteTime += STEP;
      musicStep++;
    }
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduleMusic, 120);
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(musicOn ? 0.55 : 0, ctx.currentTime, 0.4);
  }

  function stopMusic() {
    if (!ctx || !musicTimer) return;
    clearInterval(musicTimer);
    musicTimer = null;
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  }

  function setSfx(on) {
    sfxOn = on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
    if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.02);
  }

  function setMusic(on) {
    musicOn = on;
    if (musicBus && musicTimer) musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.2);
  }

  // --- Ambience: birdsong for sunny fields, steady rain for the monsoon. ---
  let ambTimer = null;
  let rainNode = null;

  function chirp() {
    if (!ctx || !sfxOn) return;
    const base = 2600 + Math.random() * 1400;
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      tone(base, 0.07, { type: "sine", to: base * (1.25 + Math.random() * 0.3), vol: 0.035, delay: i * 0.11 });
    }
  }

  function startAmbience(kind) {
    stopAmbience();
    if (!ensure()) return;
    if (kind === "monsoon") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1600;
      const g = ctx.createGain();
      g.gain.value = 0.09;
      src.connect(f); f.connect(g); g.connect(sfxBus);
      src.start();
      rainNode = src;
      return;
    }
    const loop = () => {
      chirp();
      ambTimer = setTimeout(loop, 2200 + Math.random() * 4500);
    };
    ambTimer = setTimeout(loop, 1500);
  }

  function stopAmbience() {
    clearTimeout(ambTimer);
    ambTimer = null;
    if (rainNode) { try { rainNode.stop(); } catch (e) { /* already stopped */ } rainNode = null; }
  }

  // --- Voice shout via the browser's speech engine, when a matching voice exists. ---
  let voiceOn = true;
  function shout(text, lang, fallbackText) {
    if (!voiceOn || !sfxOn || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      let v = voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(lang.slice(0, 2)));
      let say = text;
      if (!v && fallbackText) {
        v = voices.find((x) => x.lang && x.lang.toLowerCase().startsWith("en"));
        say = fallbackText;
      }
      if (!v) return;
      const u = new SpeechSynthesisUtterance(say);
      u.voice = v;
      u.lang = v.lang;
      u.rate = 1.05;
      u.pitch = 1.5;
      u.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }
  function setVoice(on) { voiceOn = on; }

  function suspend() { if (ctx && ctx.state === "running") ctx.suspend(); }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  window.SaatAudio = { unlock, sfx, startMusic, stopMusic, setSfx, setMusic, suspend, resume, startAmbience, stopAmbience, shout, setVoice };
})();
