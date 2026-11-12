/* =========================================================
   MINI-GAMES — each returns a Promise.
   prep     clickable apartment, drag the wardrobe, clock 21:xx → 23:47
   hold     hold your breath while a torch beam passes
   mash     hammer a button (door, run, pull up)
   climb    alternate left/right down the lift cables
   timing   stop the marker in the green zone (balcony jump)
   stealth  canvas side-view: move between cover, avoid torch cones
   All accept keyboard, mouse and touch. ctx: { s, paused(), notify(who,t), clock(min) }
   ========================================================= */
F12.Mini = (() => {
  const A = F12.Audio, ART = F12.Art, CFG = F12.CONFIG;
  const $ = q => document.querySelector(q);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const root = () => $('#mini');
  const fmt = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  let keyHandler = null, gen = 0;
  function onKeys(fn) { offKeys(); keyHandler = fn; document.addEventListener('keydown', fn); document.addEventListener('keyup', fn); }
  function offKeys() { if (keyHandler) { document.removeEventListener('keydown', keyHandler); document.removeEventListener('keyup', keyHandler); keyHandler = null; } }
  function open(html, cls) { const r = root(); r.className = 'mini' + (cls ? ' ' + cls : ''); r.innerHTML = html; return r; }
  function close() { gen++; offKeys(); const r = root(); r.className = 'mini hidden'; r.innerHTML = ''; }
  function result(ok, txt) {
    return new Promise(res => {
      A.sting(ok ? 'success' : 'fail'); if (!ok) A.sfx('crash');
      open(`<div class="mg-res ${ok ? 'ok' : 'fail'}">${txt || (ok ? 'Clear' : 'Caught')}</div>`, 'full');
      setTimeout(() => { close(); res(ok); }, 1100);
    });
  }
  /* rAF loop that respects pause */
  function loop(ctx, step) {
    let last = performance.now(), alive = true; const g0 = gen;
    const f = t => { if (!alive || gen !== g0) return; const dt = Math.min(.05, (t - last) / 1000); last = t; if (!ctx.paused()) step(dt); requestAnimationFrame(f); };
    requestAnimationFrame(f);
    return () => { alive = false; };
  }
  const auto = () => window.F12 && F12.debugAuto;

  /* ================= PREP ================= */
  function prep(ctx) {
    const s = ctx.s, sc = $('#scene'), P = ART.APT;
    const done = {}, END = CFG.prep.end;
    let clock = Math.max(CFG.prep.start, s.clock || CFG.prep.start), busy = false, wx = P.wardrobe.x, finished = false;
    const events = [[22 * 60 + 5, 'max', 'Hear the dogs? 11th floor now.'], [22 * 60 + 50, 'max', 'Lights off if you can. They look for light under doors.'], [23 * 60 + 30, 'max', 'They\'re on the stairs. Quiet now.']];
    if (auto()) {
      const pick = F12.debugPrep || ['bag', 'bottles', 'tub', 'glass', 'bells', 'chair'];
      pick.forEach(k => { done[k] = 1; });
      return Promise.resolve(Object.assign({ minutes: END - clock }, done));
    }
    return new Promise(res => {
      sc.classList.add('prep');
      const opts = () => ({ noWardrobe: 1, tubFull: done.tub, bottlesFull: done.bottles, foodHidden: done.food, glass: done.glass, bells: done.bells, chairAtDoor: done.chair, bag: done.bag, curtains: done.curtains, lightsOff: done.curtains });
      const room = () => sc.querySelector('.layer[data-d="0.5"]');
      const redraw = () => { const L = ART.scene('apartment', opts()); const tmp = document.createElement('div'); tmp.innerHTML = L.html; const nr = tmp.querySelector('.layer[data-d="0.5"]'); room().innerHTML = nr.innerHTML; };
      redraw();
      // hotspot layer on top of the room, same 1600×900 space
      const cam = sc.querySelector('.cam'), hot = document.createElement('div');
      hot.className = 'layer'; hot.dataset.d = '0'; hot.style.zIndex = 3;
      const spots = Object.entries(P.spots).map(([k, p]) => `<g class="hot" data-k="${k}" tabindex="0" role="button" aria-label="${p.label}, ${p.cost} minutes"><circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="transparent"/><circle class="hl" cx="${p.x}" cy="${p.y}" r="${p.r}" fill="rgba(255,174,66,.12)"/><circle class="ring" cx="${p.x}" cy="${p.y}" r="${p.r * .62}"/></g>`).join('');
      hot.innerHTML = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${spots}<g class="drag" id="wardG">${ART.wardrobe(0)}<rect x="0" y="300" width="170" height="390" fill="transparent"/><circle class="ring" cx="85" cy="495" r="60"/></g><path id="wardGuide" d="M${P.wardrobe.target} 700 h170" stroke="#ffae42" stroke-width="4" stroke-dasharray="10 10" opacity=".5"/></svg>`;
      cam.appendChild(hot);
      const svg = hot.querySelector('svg'), wg = hot.querySelector('#wardG');
      const placeW = () => wg.setAttribute('transform', `translate(${wx} 0)`);
      placeW();
      // centre the scroll on the door/window area on narrow screens
      requestAnimationFrame(() => { sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * .5; });

      const tasks = Object.entries(P.spots).map(([k, p]) => [k, p.label.replace(/^(\w)/, c => c), p.cost]).concat([['wardrobe', 'Drag the wardrobe to the door', P.wardrobe.cost]]);
      open(`<button class="prep-pan l" id="panL" aria-label="Look left"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button class="prep-pan r" id="panR" aria-label="Look right"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        <div class="prep-hud"><div class="prep-top"><div class="mg-hint" id="prepHint">Tap an object to prepare. Every task costs time.</div><button class="mbtn primary" id="prepDone" style="width:auto;padding:10px 14px">Wait in the dark</button></div>
        <div class="prep-tasks" id="prepTasks">${tasks.map(([k, l, c]) => `<div class="task" data-k="${k}">${l} <b>${c}m</b></div>`).join('')}</div></div>`);
      const hint = $('#prepHint');
      const left = () => END - clock;
      const refresh = () => {
        ctx.clock(clock);
        document.querySelectorAll('#prepTasks .task').forEach(t => { const k = t.dataset.k, c = k === 'wardrobe' ? P.wardrobe.cost : P.spots[k].cost; t.classList.toggle('done', !!done[k]); t.classList.toggle('no', !done[k] && c > left()); });
        hot.querySelectorAll('.hot').forEach(h => { h.classList.toggle('done', !!done[h.dataset.k]); h.style.display = (!done[h.dataset.k] && P.spots[h.dataset.k].cost > left()) ? 'none' : ''; });
        if (left() < 5 && !finished) setTimeout(finish, 900);
      };
      const fire = () => { while (events.length && clock >= events[0][0]) { const e = events.shift(); ctx.notify(e[1], e[2]); } };
      const spend = (mins, label, sfx) => new Promise(r2 => {
        busy = true; A.sfx(sfx);
        const box = document.createElement('div'); box.className = 'busy-bar'; box.innerHTML = `${label}…<div class="mg-bar"><i></i></div><span>${mins} min</span>`;
        root().appendChild(box);
        const bar = box.querySelector('i'), t0 = clock, dur = mins * CFG.prep.realMsPerMinute; let el = 0;
        const stop = loop(ctx, dt => {
          el += dt * 1000; const k = clamp(el / dur, 0, 1);
          bar.style.width = (k * 100) + '%'; clock = Math.round(t0 + mins * k); ctx.clock(clock); fire();
          if (Math.floor(el / 250) !== Math.floor((el - dt * 1000) / 250)) A.sfx('tick');
          if (k >= 1) { stop(); box.remove(); busy = false; r2(); }
        });
      });
      const SFX = { tub: 'water', bottles: 'water', food: 'creak', glass: 'click', bells: 'bells', chair: 'scrape', bag: 'step', curtains: 'click' };
      async function doTask(k) {
        if (busy || finished || done[k]) return;
        const p = P.spots[k]; if (p.cost > left()) { hint.textContent = 'No time for that now.'; return; }
        hot.querySelector(`.hot[data-k="${k}"]`).classList.add('busy');
        await spend(p.cost, p.label, SFX[k]);
        done[k] = 1; redraw(); refresh();
        hint.textContent = left() > 0 ? `${fmt(END - clock)} left before midnight-ish.` : 'Out of time.';
      }
      hot.addEventListener('click', e => { const h = e.target.closest('.hot'); if (h) doTask(h.dataset.k); });
      hot.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.hot')) { e.preventDefault(); doTask(e.target.closest('.hot').dataset.k); } });

      // wardrobe drag-and-drop
      let drag = null, lastScrape = 0;
      const toSvg = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
      wg.addEventListener('pointerdown', ev => {
        if (busy || finished || done.wardrobe) return;
        if (P.wardrobe.cost > left()) { hint.textContent = 'No time to move the wardrobe now.'; return; }
        ev.preventDefault(); wg.setPointerCapture(ev.pointerId); drag = { x0: toSvg(ev).x, w0: wx }; hint.textContent = 'Drag it all the way to the door.';
      });
      wg.addEventListener('pointermove', ev => {
        if (!drag) return;
        wx = clamp(drag.w0 + toSvg(ev).x - drag.x0, P.wardrobe.x, P.wardrobe.target); placeW();
        const n = performance.now(); if (n - lastScrape > 260) { A.sfx('scrape'); lastScrape = n; }
      });
      const drop = async () => {
        if (!drag) return; drag = null;
        if (wx >= P.wardrobe.target - 20) {
          wx = P.wardrobe.target; placeW(); hot.querySelector('#wardGuide').remove();
          await spend(P.wardrobe.cost, 'Shoving the wardrobe against the door', 'drag');
          done.wardrobe = 1; wg.classList.remove('drag'); wg.querySelector('.ring').remove(); refresh();
        } else hint.textContent = 'Not far enough. Drag it against the door.';
      };
      wg.addEventListener('pointerup', drop); wg.addEventListener('pointercancel', drop);
      // keyboard alternative for the wardrobe
      wg.setAttribute('tabindex', '0'); wg.setAttribute('role', 'button'); wg.setAttribute('aria-label', 'Push the wardrobe to the door, 40 minutes');
      wg.addEventListener('keydown', async e => { if ((e.key === 'Enter' || e.key === ' ') && !done.wardrobe && !busy && P.wardrobe.cost <= left()) { e.preventDefault(); drag = { x0: 0, w0: wx }; wx = P.wardrobe.target; placeW(); drag = {}; await drop(); } });

      $('#panL').onclick = () => sc.scrollBy({ left: -sc.clientWidth * .6, behavior: 'smooth' });
      $('#panR').onclick = () => sc.scrollBy({ left: sc.clientWidth * .6, behavior: 'smooth' });
      $('#prepDone').onclick = () => { if (!busy) finish(); };
      function finish() {
        if (finished) return; finished = true;
        hot.remove(); sc.classList.remove('prep'); close();
        res(Object.assign({ minutes: clock - CFG.prep.start }, done));
      }
      refresh();
    });
  }

  /* ================= HOLD BREATH ================= */
  function hold(ctx, o) {
    if (auto()) return Promise.resolve(auto() === 'win');
    return new Promise(res => {
      const long = !!o.long, AIR = long ? 8.5 : 6.5, PASS = long ? 5 : 3.8, START = 1.4;
      open(`<div class="mg-panel" style="margin-top:auto">
        <div class="mg-title">${o.title || 'Hold your breath'}</div>
        <div class="mg-hint">Hold <kbd>Space</kbd> or the button before the light reaches you. Let go only after it passes.</div>
        <div class="mg-row"><span>Light</span><span id="hStat">get ready</span></div>
        <div class="mg-bar"><span class="zone" style="left:42%;width:16%"></span><span class="mark" id="hBeam" style="left:0%"></span></div>
        <div class="mg-row"><span>Air</span><span></span></div><div class="mg-bar danger" id="hAirB"><i id="hAir" style="width:100%"></i></div>
        <button class="mg-btn" id="hBtn">Hold</button></div>
        <div style="position:fixed;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(18% 40% at var(--bx,0%) 70%,rgba(255,246,216,.25),transparent 70%)" id="hLight"></div>`);
      const btn = $('#hBtn'), beam = $('#hBeam'), air = $('#hAir'), stat = $('#hStat'), light = $('#hLight');
      let holding = false, t = 0, a = AIR, over = false, passed = false;
      const set = v => { holding = v; btn.classList.toggle('down', v); btn.textContent = v ? 'Holding…' : 'Hold'; if (v) A.sfx('breath'); };
      btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => holding && release()));
      onKeys(e => { if (e.code !== 'Space' && e.key !== 'Enter') return; e.preventDefault(); if (e.type === 'keydown' && !e.repeat) set(true); else if (e.type === 'keyup' && holding) release(); });
      A.heartbeat(100);
      function release() { set(false); if (passed && !over) end(true); }
      function end(ok) { if (over) return; over = true; stop(); A.heartbeat(0); if (!ok) A.sfx('breath'); result(ok, ok ? 'Unseen' : 'Seen').then(res); }
      const stop = loop(ctx, dt => {
        t += dt;
        const k = clamp((t - START) / PASS, 0, 1), pos = k * 100;
        beam.style.left = pos + '%'; light.style.setProperty('--bx', pos + '%');
        const inZone = pos > 38 && pos < 62;
        if (holding) { a -= dt; air.style.width = clamp(a / AIR * 100, 0, 100) + '%'; if (a <= 0) { stat.textContent = 'gasp'; return end(false); } }
        if (t < START) stat.textContent = 'it\'s coming';
        else if (!passed) stat.textContent = inZone ? 'on you' : pos < 42 ? 'closer…' : 'passing';
        if (inZone && !holding) return end(false);
        if (k >= 1 && !passed) { passed = true; stat.textContent = 'release'; btn.textContent = 'Release'; if (!holding) end(true); }
        if (passed && t > START + PASS + 2.5) end(false);
      });
    });
  }

  /* ================= MASH ================= */
  function mash(ctx, o) {
    const s = ctx.s;
    let diff = o.diff || 1, time = o.time || 6;
    if (o.door) {
      const p = s.prep || {}, def = (p.wardrobe ? 2 : 0) + (p.chair ? 1 : 0) + (p.glass || p.bells ? 1 : 0) + (s.f.warned ? 1 : 0) - (s.f.doorDamaged ? 1 : 0);
      diff = clamp(1.55 - def * .24, .5, 1.6); time = 6 + def * .4;
    }
    if (o.stamina || o.door) { if (s.f.stamina) diff -= .18; if (s.f.hurt) diff += .15; }
    if (auto()) return Promise.resolve(auto() === 'win');
    return new Promise(res => {
      open(`<div class="mg-panel" style="margin-top:auto"><div class="mg-title">${o.title || 'Mash'}</div><div class="mg-hint">${o.hint || ''} · tap the button or <kbd>Space</kbd></div>
        <div class="mg-bar"><i id="mFill"></i></div><div class="mg-row"><span id="mTime"></span><span>${diff > 1.2 ? 'hard' : diff < .8 ? 'manageable' : 'tough'}</span></div>
        <button class="mg-btn" id="mBtn">${o.title || 'Push'}</button></div>`);
      const fill = $('#mFill'), tl = $('#mTime'), btn = $('#mBtn');
      let v = 18, t = time, over = false;
      const hit = () => { if (over) return; v += 7.2; A.sfx('thud'); btn.classList.add('down'); setTimeout(() => btn.classList.remove('down'), 60); if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} };
      btn.addEventListener('pointerdown', e => { e.preventDefault(); hit(); });
      onKeys(e => { if (e.type === 'keydown' && !e.repeat && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); hit(); } });
      A.heartbeat(140);
      const stop = loop(ctx, dt => {
        t -= dt; v -= 22 * diff * dt; v = clamp(v, 0, 100);
        fill.style.width = v + '%'; tl.textContent = Math.max(0, t).toFixed(1) + 's';
        if (v >= 100) end(true); else if (t <= 0 || v <= 0) end(false);
      });
      function end(ok) { if (over) return; over = true; stop(); A.heartbeat(0); result(ok, ok ? 'Held' : 'Lost it').then(res); }
    });
  }

  /* ================= CLIMB ================= */
  function climb(ctx, o) {
    const s = ctx.s; let diff = 1 + (s.inv.light ? 0 : .25) + (s.f.hurt ? .2 : 0) - (s.f.stamina ? .2 : 0);
    if (auto()) return Promise.resolve(auto() === 'win');
    return new Promise(res => {
      open(`<div class="mg-panel" style="margin-top:auto"><div class="mg-title">${o.title || 'Climb'}</div><div class="mg-hint">Alternate <kbd>←</kbd> <kbd>→</kbd> (or <kbd>A</kbd> <kbd>D</kbd>, or the two buttons). Same hand twice and you slip.</div>
        <div class="mg-row"><span>Floor <b id="cFloor">11</b></span><span id="cTime"></span></div><div class="mg-bar"><i id="cFill"></i></div>
        <div class="mg-pair"><button class="mg-btn alt" id="cL">Left</button><button class="mg-btn alt" id="cR">Right</button></div></div>`);
      const fill = $('#cFill'), fl = $('#cFloor'), tl = $('#cTime'), bL = $('#cL'), bR = $('#cR');
      let v = 0, last = null, t = 11, over = false;
      const grab = side => {
        if (over) return;
        const b = side === 'L' ? bL : bR; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90);
        if (side === last) { v -= 5; A.sfx('cable'); document.getElementById('stage').classList.remove('cam-shake'); void document.getElementById('stage').offsetWidth; document.getElementById('stage').classList.add('cam-shake'); }
        else { v += 6.4 / diff; A.sfx('step'); }
        last = side;
      };
      bL.addEventListener('pointerdown', e => { e.preventDefault(); grab('L'); });
      bR.addEventListener('pointerdown', e => { e.preventDefault(); grab('R'); });
      onKeys(e => { if (e.type !== 'keydown' || e.repeat) return; if (/^(ArrowLeft|KeyA)$/.test(e.code)) grab('L'); else if (/^(ArrowRight|KeyD)$/.test(e.code)) grab('R'); });
      A.heartbeat(120);
      const stop = loop(ctx, dt => {
        t -= dt; v = clamp(v - 6 * diff * dt, 0, 100);
        fill.style.width = v + '%'; fl.textContent = Math.max(1, 11 - Math.floor(v / 10)); tl.textContent = Math.max(0, t).toFixed(1) + 's';
        if (v >= 100) end(true); else if (t <= 0) end(false);
      });
      function end(ok) { if (over) return; over = true; stop(); A.heartbeat(0); result(ok, ok ? 'Bottom' : 'Slipped').then(res); }
    });
  }

  /* ================= TIMING ================= */
  function timing(ctx, o) {
    const s = ctx.s;
    if (auto()) return Promise.resolve(auto() === 'win');
    return new Promise(res => {
      const w = 17 + (s.f.stamina ? 4 : 0) - (s.f.hurt ? 3 : 0), z0 = 30 + Math.random() * 45;
      open(`<div class="mg-panel" style="margin-top:auto"><div class="mg-title">${o.title || 'Now'}</div><div class="mg-hint">Tap the button or <kbd>Space</kbd> when the marker is in the green.</div>
        <div class="mg-bar" style="height:26px"><span class="zone" style="left:${z0}%;width:${w}%"></span><span class="mark" id="tMark"></span></div>
        <button class="mg-btn" id="tBtn">${o.title || 'Go'}</button></div>`);
      const mark = $('#tMark');
      let p = 0, dir = 1, over = false, sp = 95 + Math.random() * 20;
      const go = () => { if (over) return; over = true; stop(); A.sfx('thud'); const ok = p >= z0 && p <= z0 + w; result(ok, ok ? 'Made it' : 'Short').then(res); };
      $('#tBtn').addEventListener('pointerdown', e => { e.preventDefault(); go(); });
      onKeys(e => { if (e.type === 'keydown' && !e.repeat && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); go(); } });
      const stop = loop(ctx, dt => { p += dir * sp * dt; if (p > 100) { p = 100; dir = -1; } if (p < 0) { p = 0; dir = 1; } mark.style.left = p + '%'; });
    });
  }

  /* ================= STEALTH (canvas) ================= */
  const THEMES = {
    garage: { len: 3400, bg: ['#0b0c0d', '#16181a'], floor: '#17191b', cover: 'car', covers: [[420, 240], [900, 140], [1380, 260], [1900, 150], [2350, 260], [2850, 170]],
      guards: [{ a: 700, b: 1700, x: 1500, dir: -1, sp: 70 }, { a: 1900, b: 3000, x: 2000, dir: 1, sp: 85 }] },
    hall: { len: 2600, bg: ['#0c0d0f', '#1a1d21'], floor: '#141210', cover: 'door', covers: [[380, 110], [760, 110], [1140, 110], [1560, 110], [1980, 110]],
      guards: [{ a: 1300, b: 1300, x: 1300, dir: -1, sp: 0, turn: 3.2 }, { a: 1700, b: 2300, x: 2200, dir: -1, sp: 60 }] },
    sewer: { len: 2900, bg: ['#060806', '#121611'], floor: '#1b241a', cover: 'pillar', covers: [[420, 120], [880, 160], [1360, 120], [1840, 170], [2320, 130]],
      guards: [{ a: 900, b: 2300, x: 2100, dir: -1, sp: 75 }] }
  };
  function stealth(ctx, o) {
    if (auto()) return Promise.resolve(auto() === 'win');
    return new Promise(res => {
      const T = THEMES[o.theme] || THEMES.garage;
      const guards = T.guards.slice(0, o.guards || T.guards.length).map(g => Object.assign({ pause: 0, look: 0, tt: 0 }, g));
      open(`<canvas class="mg-canvas" id="sCv"></canvas><div class="mg-panel" style="position:relative;margin-top:calc(60px + var(--safe-t));text-align:center;padding:10px 14px">
        <div class="mg-title" style="font-size:20px">Stay in the dark</div><div class="mg-hint" style="margin:0">Hold <kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd> or the buttons. Cover hides you. Torches don't forgive.</div>
        <div class="mg-bar danger mg-detect"><i id="sDet"></i></div></div>
        <div class="mg-ctrl"><button class="mg-btn alt" id="sL">◀</button><button class="mg-btn alt" id="sR">▶</button></div>`, 'full');
      const cv = $('#sCv'), g2 = cv.getContext('2d'), det = $('#sDet');
      let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
      const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; };
      size(); window.addEventListener('resize', size);
      const P = { x: 120, v: 0, dir: 1, step: 0 }, keys = { L: 0, R: 0 };
      let detect = 0, over = false, cam = 0, t = 0;
      const hold = (id, k) => { const b = $(id); const on = e => { e.preventDefault(); keys[k] = 1; }; const off = () => { keys[k] = 0; }; b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off)); };
      hold('#sL', 'L'); hold('#sR', 'R');
      onKeys(e => { const v = e.type === 'keydown' ? 1 : 0; if (/^(ArrowLeft|KeyA)$/.test(e.code)) { keys.L = v; e.preventDefault(); } if (/^(ArrowRight|KeyD)$/.test(e.code)) { keys.R = v; e.preventDefault(); } });
      const inCover = x => T.covers.some(([cx, w]) => x > cx + 12 && x < cx + w - 12);
      A.heartbeat(90);
      const stop = loop(ctx, dt => {
        t += dt;
        const mv = keys.R - keys.L; P.v = mv * 210; P.x = clamp(P.x + P.v * dt, 40, T.len - 40); if (mv) { P.dir = mv; P.step += dt * 9; if (Math.floor(P.step) % 2 === 0 && Math.floor(P.step - dt * 9) % 2 !== 0) A.sfx('step'); }
        const hidden = inCover(P.x) && !mv ? true : inCover(P.x);
        let seen = 0;
        guards.forEach(g => {
          if (g.turn) { g.tt += dt; if (g.tt > g.turn) { g.tt = 0; g.dir *= -1; } }
          else if (g.pause > 0) { g.pause -= dt; if (g.pause <= 0) g.dir *= -1; }
          else { g.x += g.dir * g.sp * dt; if (g.x < g.a || g.x > g.b) { g.x = clamp(g.x, g.a, g.b); g.pause = 1.3; } }
          const dx = P.x - g.x, reach = 420;
          const facing = Math.sign(dx) === g.dir;
          if (!hidden && facing && Math.abs(dx) < reach) seen = Math.max(seen, 1.9 - Math.abs(dx) / reach);
          if (Math.abs(dx) < 34 && !hidden) seen = 9;
        });
        detect = clamp(detect + (seen ? seen * dt * 1.15 : -dt * .5), 0, 1);
        det.style.width = (detect * 100) + '%';
        A.heartbeat(detect > .5 ? 150 : detect > .1 ? 120 : 90);
        if (detect >= 1) return end(false);
        if (P.x >= T.len - 80) return end(true);
        cam += ((P.x - W * .35) - cam) * Math.min(1, dt * 4); cam = clamp(cam, 0, Math.max(0, T.len - W));
        draw(hidden);
      });
      function draw(hidden) {
        const g = g2, floorY = H * .78;
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, T.bg[0]); bg.addColorStop(1, T.bg[1]); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // far parallax: pillars / doors / arches
        g.fillStyle = 'rgba(255,255,255,.035)';
        for (let x = -((cam * .4) % 260); x < W; x += 260) { if (o.theme === 'sewer') { g.beginPath(); g.arc(x + 130, floorY, 150, Math.PI, 0); g.lineWidth = 14; g.strokeStyle = 'rgba(120,140,110,.08)'; g.stroke(); } else g.fillRect(x, H * .15, 40, floorY - H * .15); }
        // ceiling lamps
        for (let x = -((cam * .7) % 520) + 200; x < W; x += 520) { const fl = Math.sin(t * 13 + x) > .96 ? .2 : 1; g.fillStyle = `rgba(220,232,224,${.5 * fl})`; g.fillRect(x, H * .1, 70, 4); const lg = g.createLinearGradient(0, H * .1, 0, floorY); lg.addColorStop(0, `rgba(220,232,224,${.05 * fl})`); lg.addColorStop(1, 'transparent'); g.fillStyle = lg; g.beginPath(); g.moveTo(x, H * .1); g.lineTo(x - 80, floorY); g.lineTo(x + 150, floorY); g.lineTo(x + 70, H * .1); g.fill(); }
        // floor
        g.fillStyle = T.floor; g.fillRect(0, floorY, W, H - floorY);
        if (o.theme === 'sewer') { g.fillStyle = 'rgba(80,110,90,.25)'; g.fillRect(0, floorY + 20, W, H); }
        if (o.theme === 'garage') { g.strokeStyle = 'rgba(201,162,39,.25)'; g.lineWidth = 4; for (let x = -(cam % 220); x < W; x += 220) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 60, floorY); g.stroke(); } }
        // exit
        const ex = T.len - 80 - cam; g.fillStyle = 'rgba(255,174,66,.15)'; g.fillRect(ex, floorY - 220, 80, 220); g.fillStyle = '#ffae42'; g.font = '600 13px ui-monospace,monospace'; g.fillText('EXIT', ex + 18, floorY - 230);
        // torch cones (additive)
        g.globalCompositeOperation = 'lighter';
        guards.forEach(gd => {
          const gx = gd.x - cam, gy = floorY - 92, len = 420 * gd.dir, wob = Math.sin(t * 2 + gd.x) * 16;
          const cg = g.createLinearGradient(gx, 0, gx + len, 0); cg.addColorStop(0, 'rgba(255,246,216,.55)'); cg.addColorStop(1, 'rgba(255,246,216,0)');
          g.fillStyle = cg; g.beginPath(); g.moveTo(gx + 10 * gd.dir, gy); g.lineTo(gx + len, floorY - 150 + wob); g.lineTo(gx + len, floorY + 30 + wob); g.closePath(); g.fill();
        });
        g.globalCompositeOperation = 'source-over';
        // player silhouette
        const px = P.x - cam, crouch = hidden ? .62 : 1, bob = P.v ? Math.sin(P.step * Math.PI) * 3 : 0;
        g.save(); g.translate(px, floorY); g.scale(P.dir, 1); g.fillStyle = hidden ? '#050607' : '#0b0d10'; g.strokeStyle = 'rgba(255,174,66,.55)'; g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(0, -112 * crouch + bob, 13, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-16, -96 * crouch + bob); g.quadraticCurveTo(0, -102 * crouch, 18, -94 * crouch + bob); g.lineTo(14, -40 * crouch); g.lineTo(-14, -40 * crouch); g.closePath(); g.fill(); g.stroke();
        const leg = P.v ? Math.sin(P.step * Math.PI) * 10 : 0;
        g.lineWidth = 9; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(-6, -42 * crouch); g.lineTo(-6 + leg, 0); g.moveTo(6, -42 * crouch); g.lineTo(6 - leg, 0); g.stroke();
        g.restore();
        // guards
        guards.forEach(gd => {
          const gx = gd.x - cam; g.save(); g.translate(gx, floorY); g.scale(gd.dir, 1); g.fillStyle = '#020203';
          g.beginPath(); g.ellipse(0, -128, 15, 17, 0, 0, Math.PI * 2); g.fill(); g.fillRect(-20, -112, 40, 74); g.fillRect(-16, -40, 12, 40); g.fillRect(4, -40, 12, 40);
          g.fillRect(14, -98, 28, 8); g.fillStyle = '#fff6d8'; g.fillRect(40, -98, 6, 8); g.restore();
        });
        // cover objects in front of the player
        T.covers.forEach(([cx, w]) => {
          const x = cx - cam; if (x > W || x + w < 0) return;
          g.fillStyle = '#08090a';
          if (T.cover === 'car') { g.beginPath(); g.moveTo(x, floorY); g.lineTo(x + 8, floorY - 60); g.quadraticCurveTo(x + w * .3, floorY - 110, x + w * .5, floorY - 110); g.quadraticCurveTo(x + w * .8, floorY - 104, x + w - 6, floorY - 58); g.lineTo(x + w, floorY); g.fill(); g.fillStyle = '#030303'; g.beginPath(); g.arc(x + w * .22, floorY, 20, 0, Math.PI * 2); g.arc(x + w * .78, floorY, 20, 0, Math.PI * 2); g.fill(); }
          else if (T.cover === 'door') { g.fillStyle = '#040405'; g.fillRect(x, floorY - 230, w, 230); g.strokeStyle = 'rgba(255,255,255,.06)'; g.strokeRect(x + 6, floorY - 224, w - 12, 224); }
          else { g.fillRect(x + w * .25, H * .12, w * .5, floorY - H * .12); g.fillRect(x, floorY - 120, w, 120); }
        });
        // vignette
        const vg = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); vg.addColorStop(0, 'transparent'); vg.addColorStop(1, `rgba(0,0,0,${.75 + detect * .2})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        if (detect > 0) { g.fillStyle = `rgba(255,30,20,${detect * .18})`; g.fillRect(0, 0, W, H); }
      }
      function end(ok) { if (over) return; over = true; stop(); A.heartbeat(0); window.removeEventListener('resize', size); result(ok, ok ? 'Through' : 'Spotted').then(res); }
    });
  }

  const RUN = { prep, hold, mash, climb, timing, stealth };
  function run(type, o, ctx) { const f = RUN[type]; return f ? f(ctx, o || {}) : Promise.resolve(true); }
  return { run, close };
})();
