/* =========================================================
   SDK — Yandex Games integration with an offline stub.
   - loads /sdk.js only on http(s) hosting, never blocks the game
   - LoadingAPI.ready, GameplayAPI start/stop, pause/resume events
   - save/load: localStorage always, Yandex player data when available
   - fullscreen (SDK first, browser API fallback), language detection
   ========================================================= */
F12.SDK = (() => {
  const C = F12.CONFIG.yandex;
  const S = { ysdk: null, player: null, playing: false, saveT: 0, onPause: null, onResume: null };
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  function loadScript() {
    return new Promise(res => {
      if (window.YaGames) return res(true);
      if (!/^https?:$/.test(location.protocol)) return res(false);
      const s = document.createElement('script');
      s.src = C.sdkUrl; s.async = true;
      s.onload = () => res(!!window.YaGames); s.onerror = () => res(false);
      document.head.appendChild(s);
      setTimeout(() => res(!!window.YaGames), C.timeoutMs);
    });
  }

  async function init(hooks) {
    S.onPause = hooks && hooks.pause; S.onResume = hooks && hooks.resume;
    if (!(await loadScript())) return false;
    try { S.ysdk = await withTimeout(window.YaGames.init(), C.timeoutMs); } catch (e) { S.ysdk = null; return false; }
    try {
      S.ysdk.on('game_api_pause', () => S.onPause && S.onPause());
      S.ysdk.on('game_api_resume', () => S.onResume && S.onResume());
    } catch (e) { /* older SDK builds */ }
    if (C.cloudSave) {
      try { S.player = await withTimeout(S.ysdk.getPlayer({ scopes: false }), C.timeoutMs); } catch (e) { S.player = null; }
    }
    return true;
  }

  const ready = () => { try { S.ysdk && S.ysdk.features.LoadingAPI && S.ysdk.features.LoadingAPI.ready(); } catch (e) {} };
  function gameplay(on) {
    try {
      const g = S.ysdk && S.ysdk.features && S.ysdk.features.GameplayAPI; if (!g) return;
      if (on && !S.playing) { g.start(); S.playing = true; } else if (!on && S.playing) { g.stop(); S.playing = false; }
    } catch (e) {}
  }
  function lang() {
    try { if (S.ysdk) return S.ysdk.environment.i18n.lang; } catch (e) {}
    return (navigator.language || 'en').slice(0, 2);
  }

  /* ---------- saves ---------- */
  const key = F12.CONFIG.saveKey;
  function readLocal() { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  async function load() {
    let local = readLocal();
    if (S.player) {
      try {
        const d = await withTimeout(S.player.getData(['save']), C.timeoutMs);
        if (d && d.save && (!local || (d.save.ts || 0) > (local.ts || 0))) local = d.save;
      } catch (e) {}
    }
    return local;
  }
  function save(data, now) {
    data.ts = Date.now();
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    if (!S.player) return;
    clearTimeout(S.saveT);
    const push = () => { try { const p = S.player.setData({ save: data }, !!now); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    if (now) push(); else S.saveT = setTimeout(push, 3000);
  }

  /* ---------- fullscreen ---------- */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  async function toggleFullscreen() {
    try {
      const fs = S.ysdk && S.ysdk.screen && S.ysdk.screen.fullscreen;
      if (fs) { return fs.status === 'on' ? fs.exit() : fs.request(); }
    } catch (e) {}
    const el = document.documentElement;
    try {
      if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) {}
  }

  /* interstitial between acts — off by default (CONFIG.yandex.showAdBetweenActs) */
  function interstitial(done) {
    if (!C.showAdBetweenActs || !S.ysdk || !S.ysdk.adv) return done();
    try {
      S.ysdk.adv.showFullscreenAdv({ callbacks: {
        onOpen: () => S.onPause && S.onPause(),
        onClose: () => { S.onResume && S.onResume(); done(); },
        onError: () => done()
      } });
    } catch (e) { done(); }
  }

  return { init, ready, gameplay, lang, load, save, toggleFullscreen, isFull, interstitial, get online() { return !!S.ysdk; }, get cloud() { return !!S.player; } };
})();
