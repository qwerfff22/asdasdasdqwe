/* =========================================================
   AUDIO — procedural Web Audio, no files.
   ambient(loc)  looping beds per location with random events
   music(mood)   drone/pulse score: calm · tension · chase · sad · dread
   sting(name)   dramatic hits · sfx(name) one-shots · heartbeat(bpm)
   blip(voice)   per-character "voice" beeps for lip-sync
   ========================================================= */
F12.Audio = (() => {
  let ctx = null, master, musG, sfxG, ambG, verb, noiseBuf, vol = { master: .8, music: .6, sfx: .9 };
  let amb = null, mus = null, hb = null, muted = false;
  const now = () => ctx.currentTime;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (ctx) { if (ctx.state === 'suspended' && !muted) ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
    musG = ctx.createGain(); sfxG = ctx.createGain(); ambG = ctx.createGain();
    [musG, sfxG, ambG].forEach(g => g.connect(comp));
    // tiny algorithmic reverb: decaying stereo noise impulse
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .35; verb.connect(vg); vg.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    apply();
    if (pendingAmb) ambient(pendingAmb); if (pendingMus) music(pendingMus);
  }
  function apply() {
    if (!ctx) return;
    master.gain.setTargetAtTime(muted ? 0 : vol.master, now(), .1);
    musG.gain.setTargetAtTime(vol.music * .55, now(), .3);
    sfxG.gain.setTargetAtTime(vol.sfx, now(), .1);
    ambG.gain.setTargetAtTime(vol.sfx * .7, now(), .3);
  }
  function setVol(v) { Object.assign(vol, v); apply(); }
  function mute(on) {
    muted = on; if (!ctx) return;
    apply();
    try { on ? ctx.suspend() : ctx.resume(); } catch (e) {}
  }
  const ok = () => ctx && ctx.state === 'running';

  /* ---------- building blocks ---------- */
  function env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function tone(f, d, o) {
    if (!ok()) return; o = o || {};
    const t = now() + (o.at || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
    env(g, t, o.a || .01, o.v || .2, d);
    osc.connect(g); g.connect(o.dest || sfxG); if (o.wet) g.connect(verb);
    osc.start(t); osc.stop(t + (o.a || .01) + d + .05);
  }
  function noise(d, o) {
    if (!ok()) return; o = o || {};
    const t = now() + (o.at || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f || 1200, t); f.Q.value = o.q || .7;
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + d);
    env(g, t, o.a || .005, o.v || .2, d);
    s.connect(f); f.connect(g); g.connect(o.dest || sfxG); if (o.wet) g.connect(verb);
    s.start(t, Math.random()); s.stop(t + (o.a || .005) + d + .05);
  }
  function loopNoise(dest, ft, f, q, v) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = ft; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(dest); s.start(0, Math.random() * 2);
    g.gain.setTargetAtTime(v, now(), 1.2);
    return { s, fl, g };
  }
  function drone(dest, f, type, v, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune || 0; g.gain.value = 0;
    o.connect(g); g.connect(dest); o.start(); g.gain.setTargetAtTime(v, now(), 2);
    return { o, g };
  }

  /* ---------- one-shot sfx ---------- */
  const FX = {
    notify() { tone(1175, .09, { v: .18 }); tone(1568, .16, { v: .15, at: .08 }); },
    send() { tone(880, .05, { type: 'triangle', v: .12 }); tone(1320, .07, { type: 'triangle', v: .1, at: .04 }); },
    type() { noise(.02, { ft: 'highpass', f: 3000, v: .05 }); },
    click() { tone(500, .03, { type: 'square', v: .05 }); },
    tick() { tone(1900, .02, { type: 'square', v: .04 }); },
    knock() { [0, .22, .44].forEach(a => { noise(.07, { f: 420, v: .9, at: a, wet: true }); tone(95, .12, { v: .5, at: a }); }); },
    bang() { noise(.25, { f: 300, v: 1, wet: true }); tone(60, .4, { v: .7, to: 35 }); },
    crash() { noise(.6, { ft: 'bandpass', f: 2500, q: .4, v: .7, wet: true }); noise(.3, { f: 250, v: .8 }); },
    glass() { for (let i = 0; i < 9; i++) tone(rnd(2600, 5200), rnd(.1, .35), { v: .07, at: rnd(0, .25), wet: true }); noise(.15, { ft: 'highpass', f: 4000, v: .2 }); },
    bells() { [0, .09, .17, .3].forEach(a => tone(rnd(1800, 2400), .5, { type: 'triangle', v: .09, at: a, wet: true })); },
    drag() { noise(.9, { ft: 'bandpass', f: 220, q: 2, v: .5, fTo: 160 }); },
    water() { noise(1.6, { ft: 'bandpass', f: 900, q: .6, v: .25 }); for (let i = 0; i < 8; i++) tone(rnd(400, 900), .06, { v: .05, at: rnd(0, 1.5) }); },
    door() { noise(.4, { ft: 'bandpass', f: 600, q: 4, v: .2, fTo: 300 }); tone(80, .2, { v: .4, at: .35 }); },
    creak() { tone(180, .7, { type: 'sawtooth', v: .04, to: 140, wet: true }); },
    step() { noise(.06, { f: 600, v: .35, wet: true }); },
    steps(n) { for (let i = 0; i < (n || 6); i++) noise(.06, { f: rnd(400, 700), v: .3, at: i * rnd(.32, .4), wet: true }); },
    scrape() { noise(.5, { ft: 'bandpass', f: 1400, q: 6, v: .15, fTo: 800 }); },
    dog() { for (let i = 0; i < 3; i++) { const a = i * .28; tone(rnd(380, 450), .12, { type: 'sawtooth', v: .06, to: 260, at: a, wet: true }); noise(.1, { ft: 'bandpass', f: 900, v: .05, at: a, wet: true }); } },
    siren() { tone(700, 2.2, { type: 'triangle', v: .03, to: 1100, a: .4, wet: true }); },
    splash() { noise(.5, { ft: 'bandpass', f: 1100, q: .5, v: .4, fTo: 400 }); },
    drip() { tone(rnd(1100, 1700), .08, { v: .12, to: 700, wet: true }); },
    metal() { [1, 2.76, 5.4].forEach(m => tone(220 * m, 1.4, { type: 'sine', v: .07, wet: true })); },
    breath() { noise(.9, { ft: 'bandpass', f: 700, q: .8, v: .12, a: .3 }); },
    thud() { tone(70, .25, { v: .7, to: 40 }); noise(.08, { f: 200, v: .4 }); },
    alarm() { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, .22, { type: 'square', v: .05, at: i * .25 }); },
    shout() { noise(.5, { ft: 'bandpass', f: 500, q: 3, v: .18, a: .05, wet: true }); },
    cable() { tone(90, 1.2, { type: 'sawtooth', v: .03, to: 70, wet: true }); noise(.3, { ft: 'bandpass', f: 3000, q: 8, v: .04 }); }
  };
  function sfx(n, arg) { try { FX[n] && FX[n](arg); } catch (e) {} }

  /* ---------- stings ---------- */
  const ST = {
    hit() { tone(48, 1.8, { v: .8, to: 30, dest: musG }); noise(1.2, { f: 160, v: .5, dest: musG, wet: true }); [220, 233, 330].forEach(f => tone(f, 2.2, { type: 'sawtooth', v: .04, dest: musG, wet: true })); },
    reveal() { tone(110, 1.4, { type: 'sawtooth', v: .05, to: 440, a: 1.2, dest: musG, wet: true }); setTimeout(() => ST.hit(), 1300); },
    lie() { [311, 330, 349, 370].forEach((f, i) => tone(f, 1.6, { type: 'triangle', v: .05, at: i * .03, dest: musG, wet: true })); },
    success() { [392, 494, 587, 784].forEach((f, i) => tone(f, .9, { type: 'triangle', v: .07, at: i * .1, dest: musG, wet: true })); },
    fail() { [220, 208, 196, 147].forEach((f, i) => tone(f, .8, { type: 'sawtooth', v: .05, at: i * .18, dest: musG, wet: true })); },
    title() { tone(55, 4, { v: .5, a: 1.5, dest: musG, wet: true }); [164.8, 196, 246.9].forEach(f => tone(f, 4, { type: 'triangle', v: .04, a: 1.5, dest: musG, wet: true })); }
  };
  function sting(n) { try { ST[n] && ST[n](); } catch (e) {} }

  /* ---------- ambient beds ---------- */
  let pendingAmb = null, pendingMus = null;
  const BEDS = {
    title: { rain: [2800, .14], low: [90, .05], events: [['siren', 9000, 16000], ['dog', 14000, 26000]] },
    apartment: { low: [60, .05], hum: [100, .015], events: [['siren', 10000, 20000], ['dog', 15000, 30000], ['shout', 18000, 34000], ['creak', 12000, 22000]] },
    hall: { low: [70, .07], wind: [500, .04], events: [['steps', 8000, 15000], ['shout', 10000, 20000], ['bang', 16000, 28000]] },
    balcony: { rain: [3200, .2], wind: [380, .12], events: [['siren', 5000, 9000], ['dog', 9000, 18000], ['shout', 9000, 16000]] },
    shaft: { low: [44, .12], wind: [260, .08], events: [['cable', 5000, 9000], ['drip', 2500, 5000], ['metal', 12000, 20000]] },
    garage: { low: [55, .08], hum: [120, .01], events: [['drip', 3000, 6000], ['steps', 9000, 16000], ['alarm', 25000, 45000]] },
    sewer: { water: [700, .16], low: [50, .07], events: [['drip', 900, 2200], ['splash', 6000, 12000], ['steps', 14000, 24000]] },
    bunker: { hum: [50, .05], fan: [1800, .04], events: [['metal', 9000, 16000], ['drip', 5000, 9000]] }
  };
  function stopAmb() {
    if (!amb) return;
    const a = amb; amb = null;
    a.timers.forEach(clearTimeout);
    a.nodes.forEach(n => { try { n.g.gain.setTargetAtTime(0, now(), .8); setTimeout(() => { try { (n.s || n.o).stop(); } catch (e) {} }, 3500); } catch (e) {} });
  }
  function ambient(name) {
    pendingAmb = name;
    if (!ctx) return;
    if (amb && amb.name === name) return;
    stopAmb();
    const b = BEDS[name]; if (!b) return;
    const a = { name, nodes: [], timers: [] };
    if (b.rain) a.nodes.push(loopNoise(ambG, 'highpass', b.rain[0], .3, b.rain[1]));
    if (b.wind) { const w = loopNoise(ambG, 'bandpass', b.wind[0], .5, b.wind[1]); a.nodes.push(w); const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = .07; lg.gain.value = b.wind[0] * .4; l.connect(lg); lg.connect(w.fl.frequency); l.start(); a.nodes.push({ o: l, g: lg }); }
    if (b.water) a.nodes.push(loopNoise(ambG, 'bandpass', b.water[0], .4, b.water[1]));
    if (b.fan) a.nodes.push(loopNoise(ambG, 'bandpass', b.fan[0], 6, b.fan[1]));
    if (b.low) a.nodes.push(drone(ambG, b.low[0], 'sine', b.low[1]));
    if (b.hum) a.nodes.push(drone(ambG, b.hum[0], 'sawtooth', b.hum[1]));
    (b.events || []).forEach(([fx, lo, hi]) => {
      const go = () => { if (amb !== a) return; if (!muted) sfx(fx); a.timers.push(setTimeout(go, rnd(lo, hi))); };
      a.timers.push(setTimeout(go, rnd(lo * .3, hi * .6)));
    });
    amb = a;
  }

  /* ---------- score ---------- */
  const MOODS = {
    calm: { root: 55, chord: [1, 1.5, 2.4], pulse: 0, lp: 700 },
    dread: { root: 49, chord: [1, 1.19, 1.5, 2.12], pulse: 0, lp: 520 },
    tension: { root: 46.25, chord: [1, 1.06, 1.5], pulse: 1.1, lp: 900 },
    chase: { root: 41.2, chord: [1, 1.19, 1.5], pulse: 2.6, lp: 1400 },
    sad: { root: 55, chord: [1, 1.19, 1.5, 1.78], pulse: 0, lp: 600 },
    hope: { root: 65.4, chord: [1, 1.26, 1.5, 2], pulse: 0, lp: 1100 }
  };
  function stopMus() {
    if (!mus) return; const m = mus; mus = null;
    clearInterval(m.iv);
    m.nodes.forEach(n => { try { n.g.gain.setTargetAtTime(0, now(), 1.2); setTimeout(() => { try { n.o.stop(); } catch (e) {} }, 5000); } catch (e) {} });
  }
  function music(mood) {
    pendingMus = mood;
    if (!ctx) return;
    if (mus && mus.mood === mood) return;
    stopMus();
    const M = MOODS[mood]; if (!M) return;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = M.lp; lp.connect(musG); lp.connect(verb);
    const m = { mood, nodes: [], iv: 0 };
    M.chord.forEach((r, i) => { m.nodes.push(drone(lp, M.root * r * 2, i ? 'sawtooth' : 'triangle', i ? .035 : .12, rnd(-8, 8))); m.nodes.push(drone(lp, M.root * r * 2, 'sawtooth', .02, rnd(6, 14))); });
    m.nodes.push(drone(lp, M.root, 'sine', .18));
    if (M.pulse) {
      let beat = 0;
      m.iv = setInterval(() => {
        if (!ok() || muted) return;
        beat++;
        tone(M.root * 2, .18, { type: 'square', v: .04, dest: lp });
        if (beat % 2 === 0) tone(M.root, .3, { v: .25, to: M.root * .7, dest: musG });
        if (mood === 'chase' && beat % 4 === 3) noise(.08, { ft: 'highpass', f: 5000, v: .06, dest: musG });
      }, 1000 / M.pulse);
    }
    mus = m;
  }

  /* ---------- heartbeat & voices ---------- */
  function heartbeat(bpm) {
    clearInterval(hb); hb = null;
    if (!bpm) return;
    const beat = () => { if (!ok() || muted) return; tone(55, .14, { v: .55, to: 40 }); tone(50, .16, { v: .4, to: 38, at: .17 }); };
    beat(); hb = setInterval(beat, 60000 / bpm);
  }
  const VOICES = { max: [190, 'triangle'], stas: [120, 'sawtooth'], lena: [300, 'triangle'], petya: [260, 'square'], unknown: [150, 'sawtooth'], you: [220, 'sine'] };
  function blip(who) {
    const v = VOICES[who] || VOICES.you;
    tone(v[0] * rnd(.85, 1.25), .05, { type: v[1], v: .035 });
  }

  return { init, setVol, mute, sfx, sting, ambient, music, heartbeat, blip, get ready() { return ok(); } };
})();
