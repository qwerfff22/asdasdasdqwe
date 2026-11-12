/* =========================================================
   CONFIG — everything tunable without touching game code.
   ========================================================= */
window.F12 = window.F12 || {};
F12.CONFIG = {
  version: '1.0.0',
  saveKey: 'floor12_anarchy_v1',
  lang: 'en',                      // 'en' only for now; strings live in story.js (F12.STR) so 'ru' can be added later

  yandex: {
    sdkUrl: '/sdk.js',             // Yandex serves the SDK from the game's own origin
    timeoutMs: 4000,               // if the SDK does not answer, the game runs offline
    cloudSave: true,               // mirror the save into player data when the player is authorised
    showAdBetweenActs: false       // interstitials are off; flip to true to call showFullscreenAdv at act breaks
  },

  // Preparation phase: the clock runs 21:00 → 23:47 (167 minutes). Tasks cost more than that on purpose.
  prep: { start: 21 * 60, end: 23 * 60 + 47, realMsPerMinute: 30 },

  // Timed choices (seconds). "Relaxed timers" in settings multiplies these.
  timers: { short: 5, normal: 7, long: 10, relaxedMul: 2 },

  // Chat pacing (ms): typing time = base + perChar * length, capped.
  typing: { base: 500, perChar: 26, max: 2600, gap: 420 },

  debug: /[?&]debug/.test(location.search)
};
