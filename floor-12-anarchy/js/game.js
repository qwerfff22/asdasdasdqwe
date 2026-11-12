/* =========================================================
   GAME — engine
   state & saves · scene/camera/lighting · cast (live actors)
   captions · phone chat · choices (timed / typed) · mini-games
   endings · menus (pause, settings, endings, credits) · input · boot
   ========================================================= */
(() => {
'use strict';
const C = F12.CONFIG, A = F12.Audio, ART = F12.Art, ST = F12.Story, SDK = F12.SDK, MINI = F12.Mini;
const N = ST.nodes, STR = F12.STR[C.lang] || F12.STR.en;
const $ = (q, el) => (el || document).querySelector(q);
const $$ = (q, el) => Array.from((el || document).querySelectorAll(q));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const parseT = t => { const p = String(t).split(':').map(Number); return p[0] * 60 + (p[1] || 0); };
const val = (x, s) => typeof x === 'function' ? x(s) : x;

/* ---------- state & saves ---------- */
const G = { tok: 0, paused: false, menuPaused: false, phone: false, contact: 'max', logs: {}, capDone: null, capFull: null, choosing: false,
  timer: null, timerLeft: 0, timerNode: null, node: null, screen: 'title', cast: [], msgCount: 0, unread: 0 };
let D = null;
const freshS = () => ({ trust: Object.assign({}, ST.trust), f: {}, inv: {}, prep: {}, clock: parseT('21:00'), used: {} });
const freshMeta = () => ({ endings: {}, settings: { master: .8, music: .6, sfx: .9, speed: 1, relaxed: false, lang: 'en' }, plays: 0 });
const S = () => D.run.s;
function normalize(d) {
  if (!d || d.v !== 1) d = { v: 1, meta: freshMeta(), run: null };
  d.meta = Object.assign(freshMeta(), d.meta || {}); d.meta.settings = Object.assign(freshMeta().settings, d.meta.settings || {});
  if (d.run && (!d.run.cp || !N[d.run.cp.node])) d.run = null;
  return d;
}
function persist(now) { SDK.save(D, now); }
function checkpoint(id) { D.run.cp = { node: id, s: JSON.parse(JSON.stringify(S())) }; persist(); }
const speed = () => [1.45, 1, .6][D.meta.settings.speed] || 1;

/* ---------- waits that respect pause ---------- */
function wait(ms) {
  return new Promise(res => {
    let left = ms; const tick = () => { if (!G.paused) left -= 50; if (left <= 0) res(); else setTimeout(tick, 50); };
    setTimeout(tick, 50);
  });
}
function setPaused(on) {
  G.paused = on || G.menuPaused || G.sdkPaused;
}

/* ---------- HUD clock ---------- */
function setClock(m) {
  S().clock = m;
  $('#clockT').textContent = fmt(m); $('#phTime').textContent = fmt(m);
  $('#clockT').classList.toggle('warn', m >= parseT('23:30') && m <= parseT('23:59'));
  const bat = clamp(31 - Math.floor(((m - parseT('21:00') + 1440) % 1440) / 22), 3, 31);
  $('#phBat').textContent = bat + '%'; $('#phBat').classList.toggle('low', bat < 12);
}
const tick = n => setClock(S().clock + (n || 1));

/* ---------- scene, camera, lighting ---------- */
let curLoc = null;
async function setScene(loc, o, instant) {
  const sc = $('#scene');
  if (!instant && curLoc) { sc.classList.add('out'); await wait(650); }
  const r = ART.scene(loc, o); sc.innerHTML = r.html; curLoc = loc;
  document.documentElement.style.setProperty('--rim', r.rim);
  $('#locName').textContent = r.name;
  sc.classList.remove('out', 'prep');
  parallax();
}
const PANS = { center: '', in: 'scale(1.12) translateY(2%)', out: 'scale(.98)', left: 'translateX(5%) scale(1.07)', right: 'translateX(-5%) scale(1.07)', up: 'translateY(6%) scale(1.07)', down: 'translateY(-6%) scale(1.07)' };
function pan(p) { const cam = $('#scene .cam'); if (cam) cam.style.transform = PANS[p] || ''; }
const mouse = { x: .5, y: .5 };
function parallax() {
  const t = performance.now() / 1000, dx = mouse.x - .5 + Math.sin(t * .23) * .04, dy = mouse.y - .5 + Math.cos(t * .19) * .03;
  $$('#scene .layer').forEach(l => { const d = +l.dataset.d || 0; if (d) l.style.transform = `translate(${(-dx * 46 * d).toFixed(1)}px,${(-dy * 22 * d).toFixed(1)}px)`; });
}
setInterval(() => { if (!G.paused) parallax(); }, 120);
function light(cls, on) { $('#light').classList.toggle(cls, on); }
function flash(cls) { const l = $('#light'); l.classList.remove(cls); void l.offsetWidth; l.classList.add(cls); setTimeout(() => l.classList.remove(cls), 1300); }
function shake(hit) { const s = $('#stage'); const c = hit ? 'cam-hit' : 'cam-shake'; s.classList.remove(c); void s.offsetWidth; s.classList.add(c); if (navigator.vibrate) try { navigator.vibrate(hit ? 40 : [30, 40, 30]); } catch (e) {} }
const FX = {
  shake: () => shake(), hit: () => shake(true), flicker: () => { flash('flicker'); A.sfx('click'); }, blackout: () => light('blackout', true), unblack: () => light('blackout', false),
  whiteflash: () => flash('whiteflash'), redflash: () => { flash('redflash'); shake(); }, sirens: () => light('sirens', true), nosirens: () => light('sirens', false),
  alarm: () => { light('alarm', true); A.sfx('alarm'); }, noalarm: () => light('alarm', false), tense: () => light('tense', true), calm: () => light('tense', false),
  rain: () => light('rain', true), norain: () => light('rain', false), shadow: () => flash('shadow-pass'), bars: () => $('#bars').classList.add('on'), nobars: () => $('#bars').classList.remove('on')
};

/* ---------- cast: live actors on stage ---------- */
function setCast(list, exprs) {
  const box = $('#cast'), keep = {};
  $$('.actor', box).forEach(a => { if (list.includes(a.dataset.who)) keep[a.dataset.who] = a; else { a.classList.remove('in'); setTimeout(() => a.remove(), 700); } });
  list.forEach((who, i) => {
    let a = keep[who];
    if (!a) {
      a = document.createElement('div'); a.className = 'actor'; a.dataset.who = who; a.style.setProperty('--sw', (5 + Math.random() * 3).toFixed(1) + 's');
      a.innerHTML = `<div class="sway-wrap">${ART.portrait(who, (exprs && exprs[who]) || 'neutral')}</div><div class="name-tag">${ART.NAMES[who] || who}</div>`;
      box.appendChild(a); requestAnimationFrame(() => requestAnimationFrame(() => a.classList.add('in')));
    } else if (exprs && exprs[who]) setExpr(who, exprs[who]);
    a.style.order = i;
  });
  G.cast = list.slice();
}
function setExpr(who, e) {
  const a = $(`#cast .actor[data-who="${who}"]`); if (!a) return;
  const old = $('.pt', a); if (old && old.classList.contains('e-' + e)) return;
  $('.sway-wrap', a).innerHTML = ART.portrait(who, e);
  a.classList.toggle('scared', e === 'scared');
}
/* blinking, glances and head turns for every live portrait on screen */
setInterval(() => {
  if (G.paused) return;
  const now = performance.now();
  $$('.pt').forEach(p => {
    if (!p._nb) p._nb = now + 1500 + Math.random() * 4000;
    if (now > p._nb) { p.classList.add('blink'); setTimeout(() => p.classList.remove('blink'), 130); p._nb = now + (Math.random() < .2 ? 250 : 2200 + Math.random() * 4200); }
    if (!p._nl) p._nl = now + 2500 + Math.random() * 5000;
    if (now > p._nl) {
      p.classList.remove('look-l', 'look-r', 'turn-l', 'turn-r', 'turn-d');
      const r = Math.random(), lying = p.classList.contains('e-lying');
      if (lying || r < .3) p.classList.add(Math.random() < .5 ? 'look-l' : 'look-r');
      if (r > .6) p.classList.add(['turn-l', 'turn-r', 'turn-d'][Math.floor(Math.random() * 3)]);
      p._nl = now + (lying ? 900 : 2500) + Math.random() * 4000;
    }
  });
}, 100);
function lipSync(el, who, ms) {
  const p = el && $('.pt', el) || el; if (!p) return () => {};
  let i = 0; const seq = [1, 2, 1, 0, 3, 1, 2, 0];
  const iv = setInterval(() => { if (G.paused) return; const m = seq[i++ % seq.length]; p.setAttribute('data-mouth', Math.random() < .25 ? 0 : m); if (i % 2) A.blip(who); }, 95);
  const stop = () => { clearInterval(iv); p.setAttribute('data-mouth', 0); };
  if (ms) setTimeout(stop, ms);
  return stop;
}

/* ---------- captions (narration + in-person lines) ---------- */
function caption(name, text, who) {
  return new Promise(res => {
    const cap = $('#caption'), tx = $('#capText');
    cap.className = 'caption' + (name ? '' : ' narr'); $('#capName').textContent = name || '';
    const words = text.split(/(\s+)/); tx.innerHTML = '';
    $$('#cast .actor').forEach(a => { a.classList.toggle('talk', a.dataset.who === who); a.classList.toggle('dim', !!who && a.dataset.who !== who); });
    const actor = who && $(`#cast .actor[data-who="${who}"]`);
    const stopLip = actor ? lipSync(actor, who) : () => {};
    let i = 0, full = false, iv;
    const per = (name ? 55 : 70) * speed();
    const showAll = () => { clearInterval(iv); tx.innerHTML = esc(text); full = true; stopLip(); cap.classList.add('ready'); };
    iv = setInterval(() => { if (G.paused) return; if (i >= words.length) return showAll(); const w = words[i++]; tx.insertAdjacentHTML('beforeend', /^\s+$/.test(w) ? w : `<span class="w">${esc(w)}</span>`); if (!name && i % 6 === 1) A.sfx('type'); }, per);
    G.capFull = () => { if (!full) { showAll(); return; } finish(); };
    const finish = () => { G.capFull = null; cap.classList.add('hidden'); $$('#cast .actor').forEach(a => a.classList.remove('dim', 'talk')); res(); };
    if (F12.debugFast) setTimeout(() => { showAll(); finish(); }, 10);
  });
}
function advance() { if (G.capFull) { A.sfx('click'); G.capFull(); } }

/* ---------- act title card ---------- */
function actCard(a) {
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'actcard';
    el.innerHTML = `<div class="ac-k">${esc(a[0])}</div><div class="ac-t">${esc(a[1])}</div>`;
    document.body.appendChild(el); A.sting('hit');
    requestAnimationFrame(() => el.classList.add('in'));
    const done = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 700); res(); };
    if (F12.debugFast) return setTimeout(done, 20);
    wait(2600).then(done);
  });
}

/* ---------- phone ---------- */
function contactInfo(id) { return ST.contacts[id] || ST.contacts.max; }
function phoneHead(e) {
  const c = contactInfo(G.contact);
  $('#phName').textContent = c.name;
  const av = $('#phAv'), cur = $('.pt', av);
  if (!cur || !cur.classList.contains('e-' + (e || 'neutral'))) av.innerHTML = ART.portrait(c.av, e || 'neutral', { crop: 'face' });
}
function setContact(id) {
  if (G.contact === id && $('#phMsgs').dataset.c === id) return;
  G.contact = id; const box = $('#phMsgs'); box.dataset.c = id; box.innerHTML = '';
  (G.logs[id] || []).forEach(m => box.appendChild(msgEl(m, true)));
  phoneHead(); setStatus('on');
}
function setStatus(st) { const el = $('#phState'); el.className = st === 'typing' ? 'typing' : st === 'off' ? 'off' : ''; el.textContent = st === 'typing' ? STR.typing : st === 'off' ? STR.offline : STR.online; }
function phone(open) {
  G.phone = !!open; $('#phone').classList.toggle('open', G.phone);
  if (G.phone) { G.unread = 0; $('#phoneBadge').classList.add('hidden'); $$('.msg.me.unread').forEach(m => m.classList.remove('unread')); scrollMsgs(); }
  $('#phInput').disabled = !G.phone || !G.inputOn; $('#phSend').disabled = $('#phInput').disabled;
}
function msgEl(m, instant) {
  const el = document.createElement('div');
  el.className = 'msg ' + m.k + (m.lie ? ' lie' : '') + (m.glitch ? ' glitch' : '') + (m.alert ? ' alert' : '');
  if (m.k === 'sys') el.textContent = m.t; else el.innerHTML = esc(m.t) + `<time>${m.ts}</time>`;
  if (instant) el.style.animation = 'none';
  return el;
}
function scrollMsgs() { const b = $('#phMsgs'); requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; }); }
function pushMsg(m) { (G.logs[G.contact] = G.logs[G.contact] || []).push(m); const el = msgEl(m); $('#phMsgs').appendChild(el); scrollMsgs(); return el; }
async function chatMsg(step, tok) {
  const who = step.m, text = step.t;
  if (who !== G.contact) setContact(who);
  if (G.phone && !F12.debugFast) {
    setStatus('typing'); phoneHead(step.e);
    const ty = document.createElement('div'); ty.className = 'msg them typing'; ty.innerHTML = '<i></i><i></i><i></i>'; $('#phMsgs').appendChild(ty); scrollMsgs();
    const p = $('#phAv .pt'); p && p.classList.add('turn-d');
    const dur = Math.min(C.typing.max, C.typing.base + C.typing.perChar * text.length) * speed();
    const typer = setInterval(() => { if (!G.paused) A.sfx('type'); }, 140);
    await wait(dur); clearInterval(typer); ty.remove(); p && p.classList.remove('turn-d');
    if (tok !== G.tok) return;
    setStatus('on');
  }
  if (++G.msgCount % 2 === 0) tick();
  pushMsg({ k: 'them', t: text, ts: fmt(S().clock), lie: step.lie, glitch: step.glitch });
  phoneHead(step.e); lipSync($('#phAv'), who === 'unknown' ? 'max' : who, 420);
  A.sfx('notify');
  if (step.lie) $('#phAv .pt') && $('#phAv .pt').classList.add('look-r');
  if (!G.phone) { notify(who, text, step.e); }
  else { const ph = $('#phone'); ph.classList.remove('buzz'); void ph.offsetWidth; ph.classList.add('buzz'); }
  if (!F12.debugFast) await wait(C.typing.gap * speed());
}
let notifT = 0;
function notify(who, text, e) {
  const lyingMax = who === 'unknownMax', id = lyingMax ? 'max' : who, c = contactInfo(id);
  $('#ntAv').innerHTML = ART.portrait(c.av, lyingMax ? 'lying' : (e || 'neutral'), { crop: 'face' });
  $('#ntName').textContent = c.name; $('#ntText').textContent = text; $('#ntTime').textContent = fmt(S().clock);
  const n = $('#notif'); n.classList.add('in'); A.sfx('notify'); shake();
  if (!G.phone) { G.unread++; $('#phoneBadge').classList.remove('hidden'); }
  clearTimeout(notifT); notifT = setTimeout(() => n.classList.remove('in'), 3200);
}

/* ---------- choices ---------- */
function talkBox() {
  let el = $('#talkChoices');
  if (!el) { el = document.createElement('div'); el.id = 'talkChoices'; el.className = 'talk-choices'; $('#app').appendChild(el); }
  return el;
}
function available(node) {
  const s = S(), used = s.used[G.node] || {};
  return node.choices.map((c, i) => Object.assign({ _i: i }, c)).filter(c => (!c.req || c.req(s)) && !(c.once && used[c._i]));
}
function showChoices(node) {
  const list = available(node), inPhone = G.phone, box = inPhone ? $('#phChoices') : talkBox();
  box.innerHTML = '';
  G.inputOn = inPhone && !!node.input; phone(G.phone);
  list.forEach((c, n) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (c.silent ? ' silent' : '');
    b.style.animationDelay = (n * 70) + 'ms';
    b.innerHTML = `<span class="k">${n + 1}</span>${esc(c.silent ? STR.silent : c.t)}`;
    b.addEventListener('click', () => choose(node, c));
    box.appendChild(b);
  });
  if (!inPhone) box.classList.add('in');
  if (inPhone) $('#phInput').placeholder = node.input ? 'Type a reply or pick one' : STR.message;
  startTimer(node, list);
  G.choosing = true;
}
function clearChoices() {
  $('#phChoices').innerHTML = ''; const t = $('#talkChoices'); if (t) { t.innerHTML = ''; t.classList.remove('in'); }
  stopTimer(); G.choosing = false; G.inputOn = false; phone(G.phone); $('#phInput').value = '';
}
function startTimer(node, list) {
  stopTimer(); if (!node.timer) return;
  const secs = (C.timers[node.timer] || 7) * (D.meta.settings.relaxed ? C.timers.relaxedMul : 1);
  const bar = G.phone ? $('#phTimer') : (() => { const d = document.createElement('div'); d.className = 'tc-timer'; d.innerHTML = '<i></i><span></span>'; talkBox().prepend(d); return d; })();
  bar.classList.remove('hidden');
  const i = $('i', bar), sp = $('span', bar);
  G.timerLeft = secs * 1000; G.timerNode = node;
  i.style.transition = 'none'; i.style.transform = 'scaleX(1)';
  A.heartbeat(110);
  G.timer = setInterval(() => {
    if (G.paused) return;
    G.timerLeft -= 100; const k = clamp(G.timerLeft / (secs * 1000), 0, 1);
    i.style.transform = `scaleX(${k})`; sp.textContent = Math.ceil(G.timerLeft / 1000) + 's';
    if (G.timerLeft % 1000 === 0 && G.timerLeft > 0) A.sfx('tick');
    if (G.timerLeft <= 0) { const sil = list.find(c => c.silent) || list[list.length - 1]; choose(node, sil, true); }
  }, 100);
}
function stopTimer() { clearInterval(G.timer); G.timer = null; $('#phTimer').classList.add('hidden'); const t = $('.tc-timer'); if (t) t.remove(); if (G.node && N[G.node] && N[G.node].timer) A.heartbeat(0); }
function rememberToast(tr) {
  Object.entries(tr || {}).forEach(([k, d]) => { if (Math.abs(d) >= 8) toast(`${ART.NAMES[k] || k} will remember that.`); });
}
async function choose(node, c, timedOut, typed) {
  if (!G.choosing) return;
  const s = S(), tok = G.tok;
  clearChoices(); A.init();
  if (!c.silent) {
    const text = typed || c.say || c.t;
    if (G.phone) { tick(); const el = pushMsg({ k: 'me', t: text, ts: fmt(s.clock) }); el.classList.add('unread'); A.sfx('send'); setTimeout(() => el.classList.remove('unread'), 900); }
    else { A.sfx('click'); await quickLine('You', text); }
  } else if (G.phone && timedOut) pushMsg({ k: 'sys', t: 'You didn\'t answer.' });
  if (c.tr) Object.entries(c.tr).forEach(([k, d]) => { s.trust[k] = clamp((s.trust[k] || 0) + d, 0, 100); });
  rememberToast(c.tr);
  if (c.set) Object.assign(s.f, c.set);
  if (c.inv) Object.assign(s.inv, c.inv);
  if (c.once) { (s.used[G.node] = s.used[G.node] || {})[c._i] = 1; }
  if (c.after) await runSteps(c.after, tok);
  if (tok !== G.tok) return;
  if (c.stay) return showChoices(node);
  play(c.to);
}
function quickLine(name, text) {
  return new Promise(res => {
    const cap = $('#caption'); cap.className = 'caption'; $('#capName').textContent = name; $('#capText').textContent = text;
    setTimeout(() => { cap.classList.add('hidden'); res(); }, F12.debugFast ? 10 : Math.min(2600, 700 + text.length * 30) * speed());
  });
}
/* typed replies are matched against each choice's keywords */
function typedReply(text) {
  const node = G.timerNode && G.choosing ? G.timerNode : N[G.node];
  if (!G.choosing || !node || !node.choices) return;
  const t = text.toLowerCase().trim(); if (!t) return;
  let best = null, score = 0;
  available(node).filter(c => !c.silent).forEach(c => {
    let sc = 0; (c.kw || []).forEach(k => { if (t.includes(k)) sc += k.length > 3 ? 2 : 1; });
    if (t === (c.t || '').toLowerCase()) sc += 5;
    if (sc > score) { score = sc; best = c; }
  });
  if (best) return choose(node, best, false, text);
  pushMsg({ k: 'me', t: text, ts: fmt(S().clock) }); A.sfx('send');
  setTimeout(() => { if (G.choosing) { pushMsg({ k: 'them', t: '?', ts: fmt(S().clock) }); A.sfx('notify'); } }, 900);
}

/* ---------- step runner ---------- */
async function runSteps(steps, tok) {
  for (const st of steps) {
    if (tok !== G.tok) return;
    const s = S();
    if (st.if) { await runSteps(st.if(s) ? (st.then || []) : (st.else || []), tok); continue; }
    if (st.n != null) await caption('', st.n);
    else if (st.s) { if (st.e) setExpr(st.s, st.e); await caption(ART.NAMES[st.s] || st.s, st.t, st.s); }
    else if (st.m) await chatMsg(st, tok);
    else if (st.me) { pushMsg({ k: 'me', t: st.me, ts: fmt(s.clock) }); A.sfx('send'); await wait(500); }
    else if (st.sys != null) { pushMsg({ k: 'sys', t: st.sys, alert: st.alert }); await wait(400); }
    else if (st.phone != null) { phone(!!st.phone); A.sfx('click'); await wait(450); }
    else if (st.notify) { notify(st.notify, st.t); await wait(900); }
    else if (st.contact) setContact(st.contact);
    else if (st.status) setStatus(st.status);
    else if (st.loc) { await setScene(st.loc, st.o); }
    else if (st.cast) setCast(val(st.cast, s), val(st.e, s));
    else if (st.e) Object.entries(val(st.e, s)).forEach(([w, e]) => setExpr(w, e));
    else if (st.fx) { FX[st.fx] && FX[st.fx](); }
    else if (st.sfx) A.sfx(st.sfx, st.a);
    else if (st.sting) A.sting(st.sting);
    else if (st.amb) A.ambient(st.amb);
    else if (st.mus) A.music(st.mus);
    else if (st.hb != null) A.heartbeat(st.hb);
    else if (st.wait) await wait(F12.debugFast ? 5 : st.wait * speed());
    else if (st.set) Object.assign(s.f, st.set);
    else if (st.tr) { Object.entries(st.tr).forEach(([k, d]) => { s.trust[k] = clamp((s.trust[k] || 0) + d, 0, 100); }); rememberToast(st.tr); }
    else if (st.inv) Object.assign(s.inv, st.inv);
    else if (st.pan) pan(st.pan);
    else if (st.clock) setClock(parseT(st.clock));
    else if (st.tick) tick(st.tick);
  }
}

/* ---------- node player ---------- */
async function play(id) {
  const tok = ++G.tok;
  if (!$('#mini').classList.contains('hidden')) { MINI.close(); $('#scene').classList.remove('prep'); }
  while (id && tok === G.tok) {
    const node = N[id]; if (!node) { console.warn('missing node', id); return; }
    G.node = id; const s = S();
    if (node.checkpoint) checkpoint(id);
    if (node.act) await actCard(node.act);
    if (tok !== G.tok) return;
    if (node.loc) await setScene(node.loc, Object.assign(node.loc === 'apartment' ? aptOpts(s) : {}, node.o || {}));
    if (node.clock) setClock(parseT(node.clock));
    if (node.steps) await runSteps(node.steps, tok);
    if (tok !== G.tok) return;
    if (node.gameover) return gameOver(node.gameover);
    if (node.ending) return ending(node.ending);
    if (node.mini) {
      const r = await runMini(node.mini);
      if (tok !== G.tok) return;
      id = r ? node.mini.win : node.mini.lose; continue;
    }
    if (node.choices) return showChoices(node);
    id = node.go ? node.go(s) : node.next;
  }
}
const aptOpts = s => { const p = s.prep || {}; return { tubFull: p.tub, bottlesFull: p.bottles, foodHidden: p.food, glass: p.glass, bells: p.bells, chairAtDoor: p.chair, bag: p.bag, curtains: p.curtains, lightsOff: p.curtains, wardrobeAtDoor: p.wardrobe }; };
async function runMini(m) {
  const s = S();
  $('#hud').classList.toggle('hidden', m.type === 'stealth');
  const ctx = { s, paused: () => G.paused, notify: (w, t) => notify(w, t), clock: setClock };
  let r = await MINI.run(m.type, m.o, ctx);
  $('#hud').classList.remove('hidden');
  if (m.type === 'prep') {
    s.prep = r; r = true; await setScene('apartment', aptOpts(s), true);
    const n = Object.keys(s.prep).filter(k => k !== 'minutes' && s.prep[k]).length;
    toast(n >= 6 ? 'Ready as you\'ll ever be.' : n >= 3 ? 'It will have to do.' : 'You barely prepared.');
  }
  return r;
}

/* ---------- endings & game over ---------- */
function endScreen(kind, title, paras, retry) {
  G.tok++; clearChoices(); phone(false); setCast([]); A.heartbeat(0); MINI.close();
  $('#eKind').textContent = kind; $('#eTitle').textContent = title;
  $('#eText').innerHTML = paras.map(p => `<p>${esc(p)}</p>`).join('');
  const s = S(), prepN = Object.keys(s.prep || {}).filter(k => k !== 'minutes' && s.prep[k]).length;
  $('#eStats').innerHTML = ['max', 'stas', 'lena', 'petya'].map(k => `<div>${ART.NAMES[k]}<b>${s.trust[k]}</b></div>`).join('') + `<div>Prepared<b>${prepN}/9</b></div>`;
  $('#btnEndRetry').classList.toggle('hidden', !retry || !D.run || !D.run.cp);
  show('scr-end'); SDK.gameplay(false); persist(true);
}
function gameOver(go) {
  A.sting('fail'); A.music('sad');
  const first = !D.meta.endings.taken; D.meta.endings.taken = (D.meta.endings.taken || 0) + 1;
  endScreen(first ? 'Ending unlocked · Taken' : 'Taken', go.title, [go.text], true);
}
function ending(id) {
  const E = ST.endings[id], s = S(), f = s.f;
  D.meta.endings[id] = (D.meta.endings[id] || 0) + 1; A.sting(id === 'daylight' ? 'success' : 'reveal');
  let p = [];
  if (id === 'daylight') {
    p.push('You walk out of the city along the river, with the sun coming up behind the smoke.');
    if (f.maxJoined) p.push('Max talks the whole way. About engines, about his sister in Tver, about anything except the night. You let him.');
    else if (f.maxHelped) p.push('You never see Max again. Somewhere, you hope, he is still owed a favour.');
    else p.push('You think about the word "please" for a long time.');
    if (f.lenaHurt) p.push('Lena leans on Petya. Petya pretends he isn\'t proud of it.'); else p.push('Lena checks everyone\'s hands at every rest stop. Nobody minds.');
    p.push('Floor 12 is still up there. So are the people who took it. That is a problem for another day. Today there is daylight.');
  } else {
    p.push('Somewhere above you, a voice you trusted is being used as a key.');
    p.push('The duct goes on into the dark. Petya is ahead of you. Someone is crying very quietly behind you.');
    p.push('To be continued in Floor 12: Anarchy, Part II.');
  }
  endScreen(E.kind, E.title, p, true);
}

/* ---------- screens & flow ---------- */
function show(id) {
  ['scr-title', 'scr-end'].forEach(x => { const el = $('#' + x); if (x === id) { el.classList.add('active'); requestAnimationFrame(() => el.classList.add('show')); } else el.classList.remove('active', 'show'); });
  G.screen = id || 'game';
  $('#hud').classList.toggle('hidden', !!id);
  SDK.gameplay(!id);
}
async function toTitle() {
  G.tok++; clearChoices(); phone(false); setCast([]); MINI.close(); A.heartbeat(0);
  ['tense', 'sirens', 'alarm', 'blackout', 'rain'].forEach(c => light(c, false)); light('rain', true); light('sirens', true); $('#bars').classList.remove('on');
  await setScene('title', {}, true); pan('center');
  A.ambient('title'); A.music('dread');
  $('#btnContinue').classList.toggle('hidden', !(D.run && D.run.cp));
  show('scr-title');
}
function resetRun() { G.logs = {}; G.msgCount = 0; $('#phMsgs').innerHTML = ''; setContact('max'); ['tense', 'sirens', 'alarm', 'blackout', 'rain'].forEach(c => light(c, false)); }
function newGame() {
  A.init(); resetRun(); D.run = { s: freshS(), cp: null }; D.meta.plays++;
  show(null); setClock(D.run.s.clock); curLoc = null;
  play(ST.start);
}
function fromCheckpoint() {
  if (!D.run || !D.run.cp) return newGame();
  A.init(); resetRun(); D.run.s = JSON.parse(JSON.stringify(D.run.cp.s)); show(null); setClock(D.run.s.clock); curLoc = null;
  play(D.run.cp.node);
}

/* ---------- modal & menus ---------- */
function modal(html, onClose) {
  const m = $('#modal'); $('#sheet').innerHTML = html; m.classList.add('open'); G.modalClose = onClose || null; A.sfx('click');
  return $('#sheet');
}
function closeModal() { $('#modal').classList.remove('open'); const cb = G.modalClose; G.modalClose = null; if (cb) cb(); }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('in'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('in'), 2600); }

function settings() {
  const st = D.meta.settings;
  const sl = (k, l) => `<div class="set-row"><span>${l}</span><input type="range" min="0" max="1" step="0.05" value="${st[k]}" data-k="${k}" aria-label="${l}"></div>`;
  const seg = (k, opts) => `<div class="seg" data-seg="${k}">${opts.map(([v, l, dis]) => `<button data-v="${v}" class="${String(st[k]) === String(v) ? 'on' : ''}" ${dis ? 'disabled title="Coming soon"' : ''}>${l}</button>`).join('')}</div>`;
  const sh = modal(`<h3>Settings</h3>${sl('master', 'Master volume')}${sl('music', 'Music')}${sl('sfx', 'Effects')}
    <div class="set-row"><span>Text speed</span>${seg('speed', [[0, 'Slow'], [1, 'Normal'], [2, 'Fast']])}</div>
    <div class="set-row"><span>${STR.relaxed}</span>${seg('relaxed', [[false, 'Off'], [true, 'On']])}</div>
    <div class="set-row"><span>Language</span>${seg('lang', [['en', 'EN'], ['ru', 'RU', 1]])}</div>
    <div class="sheet-btns"><button class="mbtn" data-a="fs">Toggle fullscreen</button><button class="mbtn primary" data-a="close">Done</button></div>
    <p style="font-size:12px;margin-top:12px">Progress saves automatically at checkpoints${SDK.cloud ? ' — on this device and in your Yandex account' : ' on this device'}.</p>`);
  sh.oninput = e => { const k = e.target.dataset.k; if (!k) return; st[k] = +e.target.value; A.setVol({ master: st.master, music: st.music, sfx: st.sfx }); };
  sh.onclick = e => {
    const b = e.target.closest('.seg button');
    if (b) { const k = b.parentNode.dataset.seg; let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; st[k] = v; $$('button', b.parentNode).forEach(x => x.classList.toggle('on', x === b)); A.sfx('click'); persist(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'fs') SDK.toggleFullscreen(); else { persist(); closeModal(); }
  };
}
function pauseMenu() {
  if (G.screen !== 'game') return;
  G.menuPaused = true; setPaused(true);
  const s = S();
  const met = ['max'].concat(s.f && (G.node || '').match(/^c[6-9]/) ? ['stas', 'lena', 'petya'] : []);
  const rows = met.map(k => `<div class="trust"><div class="tav">${ART.portrait(k, 'neutral', { crop: 'face' })}</div><div class="tinfo"><b>${ART.NAMES[k]}</b><span>${s.trust[k] >= 60 ? 'trusts you' : s.trust[k] >= 40 ? 'unsure of you' : 'wary of you'}</span><div class="tbar"><i style="width:${s.trust[k]}%"></i></div></div></div>`).join('');
  const sh = modal(`<h3>Paused</h3>${rows}<div class="sheet-btns"><button class="mbtn primary" data-a="resume">Resume</button><button class="mbtn" data-a="settings">Settings</button><button class="mbtn" data-a="cp">Restart from checkpoint</button><button class="mbtn" data-a="menu">Main menu</button></div>`,
    () => { G.menuPaused = false; setPaused(false); });
  sh.onclick = e => {
    const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
    if (k === 'resume') closeModal();
    else if (k === 'settings') { G.modalClose = null; settings(); G.modalClose = () => { G.menuPaused = false; setPaused(false); }; }
    else if (k === 'cp') { G.modalClose = null; $('#modal').classList.remove('open'); G.menuPaused = false; setPaused(false); fromCheckpoint(); }
    else if (k === 'menu') { G.modalClose = null; $('#modal').classList.remove('open'); G.menuPaused = false; setPaused(false); persist(true); toTitle(); }
  };
}
function endingsList() {
  const rows = Object.entries(ST.endings).map(([k, e]) => { const got = D.meta.endings[k]; return `<div class="${got ? '' : 'lock'}"><b>${got ? esc(e.title) : '? ? ?'}</b><span>${esc(e.kind)}${got ? ' · ' + esc(e.desc) + ' · ×' + got : ''}</span></div>`; }).join('');
  const sh = modal(`<h3>Endings</h3><div class="end-list">${rows}</div><div class="sheet-btns"><button class="mbtn primary" data-a="close">Close</button></div>`);
  sh.onclick = e => { if (e.target.closest('[data-a]')) closeModal(); };
}
function credits() {
  const sh = modal(`<h3>Credits</h3><div class="credits"><h4>Floor 12: Anarchy</h4><p>A choice-driven survival thriller in one HTML page.</p>
    <h4>Writing, design, code</h4><p>Built for Yandex Games with vanilla JavaScript, SVG, Canvas and the Web Audio API.</p>
    <h4>Art &amp; sound</h4><p>Every character, room and sound is generated in code. No external assets.</p>
    <h4>Cast</h4><p>Max Orlov, apt 45 · Stas · Lena · Petya · and you, apt 47.</p>
    <h4>Thanks</h4><p>To everyone who ever wedged a chair under a door handle.</p></div><div class="sheet-btns"><button class="mbtn primary" data-a="close">Close</button></div>`);
  sh.onclick = e => { if (e.target.closest('[data-a]')) closeModal(); };
}

/* ---------- input ---------- */
function bind() {
  const on = (q, ev, fn) => { const el = $(q); if (el) el.addEventListener(ev, fn); };
  document.addEventListener('pointerdown', () => A.init(), { passive: true });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; }, { passive: true });
  window.addEventListener('deviceorientation', e => { if (e.gamma == null) return; mouse.x = clamp(.5 + e.gamma / 60, 0, 1); mouse.y = clamp(.5 + (e.beta - 45) / 80, 0, 1); });
  on('#caption', 'click', advance);
  on('#stage', 'click', advance);
  on('#btnNew', 'click', () => { if (D.run && D.run.cp) { const sh = modal('<h3>New game?</h3><p>Your checkpoint will be overwritten. Endings you unlocked stay.</p><div class="sheet-btns"><button class="mbtn primary" data-a="y">Start over</button><button class="mbtn" data-a="n">Cancel</button></div>'); sh.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; closeModal(); if (a.dataset.a === 'y') newGame(); }; } else newGame(); });
  on('#btnContinue', 'click', fromCheckpoint);
  on('#btnSettings', 'click', settings);
  on('#btnCredits', 'click', credits);
  on('#btnEndings', 'click', endingsList);
  on('#btnFs', 'click', () => SDK.toggleFullscreen());
  on('#btnPause', 'click', pauseMenu);
  on('#btnPhone', 'click', () => { phone(!G.phone); A.sfx('click'); if (G.choosing) { const node = N[G.node]; clearChoices(); showChoices(node); } });
  on('#phClose', 'click', () => { phone(false); A.sfx('click'); if (G.choosing) { const node = N[G.node]; clearChoices(); showChoices(node); } });
  on('#notif', 'click', () => { $('#notif').classList.remove('in'); if (!G.phone) { phone(true); if (G.choosing) { const node = N[G.node]; clearChoices(); showChoices(node); } } });
  on('#phForm', 'submit', e => { e.preventDefault(); const v = $('#phInput').value; $('#phInput').value = ''; typedReply(v); });
  on('#btnEndRetry', 'click', fromCheckpoint);
  on('#btnEndNew', 'click', newGame);
  on('#btnEndMenu', 'click', toTitle);
  on('#modal', 'click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') { if ($('#modal').classList.contains('open')) closeModal(); else pauseMenu(); return; }
    if (G.screen !== 'game' || $('#modal').classList.contains('open') || !$('#mini').classList.contains('hidden')) return;
    if ((e.code === 'Space' || e.key === 'Enter') && G.capFull) { e.preventDefault(); advance(); return; }
    if (/^[1-5]$/.test(e.key) && G.choosing) { const box = G.phone ? $('#phChoices') : $('#talkChoices'); const b = box && $$('.choice', box)[+e.key - 1]; if (b) b.click(); }
    if (e.key.toLowerCase() === 'p') $('#btnPhone').click();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { setPaused(true); A.mute(true); persist(true); } else { if (!G.sdkPaused) { setPaused(false); A.mute(false); } } });
  window.addEventListener('pagehide', () => persist(true));
  const orient = () => { const r = $('#rotate'); const portraitPhone = innerHeight > innerWidth && innerWidth < 700; r.classList.toggle('show', portraitPhone && !G.rotSeen); if (portraitPhone && !G.rotSeen) setTimeout(() => { r.classList.remove('show'); G.rotSeen = true; }, 4500); };
  window.addEventListener('resize', orient); orient();
}

/* ---------- debug API (?debug) ---------- */
function debugAPI() {
  return {
    state: () => ({ node: G.node, screen: G.screen, choosing: G.choosing, caption: !!G.capFull, phone: G.phone, mini: !$('#mini').classList.contains('hidden'), s: S && D.run ? S() : null, endings: D.meta.endings }),
    choices: () => G.choosing ? available(N[G.node]).map(c => c.silent ? '(silent)' : c.t) : [],
    choose: i => { const box = G.phone ? $('#phChoices') : $('#talkChoices'); const b = box && $$('.choice', box)[i]; if (b) b.click(); return !!b; },
    type: t => typedReply(t), advance, goto: id => play(id), newGame, fromCheckpoint, toTitle,
    auto: v => { F12.debugAuto = v; }, prep: list => { F12.debugPrep = list; }, fast: v => { F12.debugFast = v; }, save: () => D
  };
}

/* ---------- boot ---------- */
async function boot() {
  const bar = $('#loader .ld-bar i'); bar.style.width = '30%';
  D = normalize(null);
  const pausedBySdk = on => { G.sdkPaused = on; setPaused(on); A.mute(on); };
  await SDK.init({ pause: () => pausedBySdk(true), resume: () => pausedBySdk(false) });
  bar.style.width = '70%';
  D = normalize(await SDK.load());
  const st = D.meta.settings; A.setVol({ master: st.master, music: st.music, sfx: st.sfx });
  D.run = D.run || null;
  if (!D.run) D.run = { s: freshS(), cp: null };
  bind();
  if (C.debug) window.__F12 = debugAPI();
  $('#tVersion').textContent = 'v' + C.version;
  await toTitle();
  bar.style.width = '100%';
  setTimeout(() => { const L = $('#loader'); L.style.opacity = 0; setTimeout(() => L.remove(), 600); SDK.ready(); }, 250);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
