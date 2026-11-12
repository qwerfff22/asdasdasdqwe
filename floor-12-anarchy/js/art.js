/* =========================================================
   ART — everything is drawn in code.
   portrait(id, expr, opts)  live SVG characters: parts for blink, lip-sync,
                             head turns, breathing; expressions:
                             neutral · scared · angry · lying · smile · sad
   scene(loc, opts)          2.5D parallax layers (1600×900 world)
   APT                       apartment coordinates used by the prep phase
   ========================================================= */
F12.Art = (() => {
  let uid = 0;
  const U = p => p + (++uid);
  const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

  /* ================= PORTRAITS ================= */
  const CHAR = {
    max:   { skin: '#c99a7c', shade: '#9c6f55', hair: '#2e231c', iris: '#5a3b22', cloth: '#3d4636', cloth2: '#2b3226', jaw: 1.0, sw: '6.2s' },
    stas:  { skin: '#b98466', shade: '#8a5b42', hair: '#6d6862', iris: '#5e7a8a', cloth: '#1d1e21', cloth2: '#111214', jaw: 1.12, sw: '7.5s' },
    lena:  { skin: '#e2b79c', shade: '#b98a70', hair: '#7a3b25', iris: '#4f7a4a', cloth: '#2c5862', cloth2: '#1f3f47', jaw: .9, sw: '5.4s' },
    petya: { skin: '#e8c2a6', shade: '#bf957a', hair: '#17151a', iris: '#3a2c22', cloth: '#4a4f57', cloth2: '#353a41', jaw: .86, sw: '4.6s' }
  };
  CHAR.unknown = CHAR.max;
  const NAMES = { max: 'Max', stas: 'Stas', lena: 'Lena', petya: 'Petya', unknown: 'Max' };

  function facePath(j) {
    const w = 42 * j, cw = 18 * j;
    return `M100 62 C${100 - w + 6} 62 ${100 - w} 86 ${100 - w} 118 C${100 - w} 150 ${100 - w + 10} 170 ${100 - cw} 184 C${96 - cw * .2} 190 98 192 100 192 C102 192 ${104 + cw * .2} 190 ${100 + cw} 184 C${100 + w - 10} 170 ${100 + w} 150 ${100 + w} 118 C${100 + w} 86 ${100 + w - 6} 62 100 62Z`;
  }
  const BROWS = {
    neutral: ['M70 117 Q81 112 92 115', 'M108 115 Q119 112 130 117'],
    smile:   ['M70 115 Q81 109 92 113', 'M108 113 Q119 109 130 115'],
    sad:     ['M70 118 Q82 116 92 110', 'M108 110 Q118 116 130 118'],
    scared:  ['M70 112 Q81 104 93 106', 'M107 106 Q119 104 130 112'],
    angry:   ['M70 110 Q82 113 94 120', 'M106 120 Q118 113 130 110'],
    lying:   ['M70 117 Q81 113 92 116', 'M108 111 Q119 104 130 110']
  };
  const MOUTH0 = {
    neutral: '<path d="M88 167 Q100 169 112 167" class="m-line"/>',
    smile:   '<path d="M86 164 Q100 176 114 164" class="m-line"/><path d="M89 166 Q100 172 111 166" fill="#fff" opacity=".7"/>',
    sad:     '<path d="M89 170 Q100 164 111 170" class="m-line"/>',
    scared:  '<ellipse cx="100" cy="168" rx="6" ry="4.5" fill="#3a1714"/><path d="M95 166 h10" stroke="#e8e0d8" stroke-width="1.6"/>',
    angry:   '<path d="M88 169 Q100 165 112 169" class="m-line" stroke-width="3"/><path d="M90 172 Q100 170 110 172" stroke="#000" stroke-opacity=".18" fill="none"/>',
    lying:   '<path d="M88 168 Q99 169 113 162" class="m-line"/>'
  };
  const MOUTHS = '<g data-m="1"><ellipse cx="100" cy="168" rx="8" ry="3.4" fill="#3a1714"/><path d="M93 166.5 h14" stroke="#e8e0d8" stroke-width="1.4"/></g>' +
    '<g data-m="2"><ellipse cx="100" cy="169" rx="8.5" ry="6.2" fill="#3a1714"/><path d="M93 165 h14" stroke="#e8e0d8" stroke-width="1.8"/><ellipse cx="100" cy="172.5" rx="5" ry="2" fill="#a3504a"/></g>' +
    '<g data-m="3"><ellipse cx="100" cy="168" rx="4.6" ry="4.8" fill="#3a1714"/></g>';

  function eye(cx, c, e, side) {
    const wide = e === 'scared', narrow = e === 'angry';
    const ry = wide ? 6.4 : 5.2, ir = wide ? 3.6 : 4.3;
    const dx = e === 'lying' ? 3.2 : e === 'sad' ? 0 : 0, dy = e === 'sad' ? 1.4 : 0;
    let s = `<ellipse cx="${cx}" cy="132" rx="9.5" ry="${ry}" fill="#efe9e2"/>`;
    s += `<g class="pupils"><g transform="translate(${dx} ${dy})"><circle cx="${cx}" cy="132" r="${ir}" fill="${c.iris}"/><circle cx="${cx}" cy="132" r="${ir * .45}" fill="#0b0705"/><circle cx="${cx - 1.6}" cy="130.4" r="1.2" fill="#fff" opacity=".9"/></g></g>`;
    if (narrow) s += `<path d="M${cx - 11} 125 L${cx + 11} ${side < 0 ? 129 : 125} L${cx + 11} 131 Q${cx} 127 ${cx - 11} 131Z" transform="${side > 0 ? `translate(${cx * 2} 0) scale(-1 1)` : ''}" fill="${c.skin}"/>`;
    if (e === 'sad') s += `<path d="M${cx - 11} 126 Q${cx} 126.5 ${cx + 11} 126 L${cx + 11} 130 Q${cx} 128.6 ${cx - 11} 130Z" fill="${c.skin}"/>`;
    s += `<path d="M${cx - 10} ${132 - ry * .55} Q${cx} ${132 - ry * 1.25} ${cx + 10} ${132 - ry * .55}" stroke="#1a1210" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M${cx - 9} ${132 + ry * .8} Q${cx} ${132 + ry * 1.1} ${cx + 9} ${132 + ry * .8}" stroke="${c.shade}" stroke-width="1.2" fill="none" opacity=".8"/>`;
    s += `<rect class="lid" x="${cx - 11}" y="${132 - ry - 1.5}" width="22" height="${ry * 2 + 3}" rx="${ry}" fill="${c.skin}"/>`;
    return s;
  }

  const DETAIL = {
    max(c) {
      return {
        back: `<path d="M56 112 C52 70 74 48 100 48 C128 48 148 70 144 112 C140 96 132 84 100 84 C70 84 60 96 56 112Z" fill="${c.hair}"/>`,
        body: `<path d="M8 262 C14 222 40 204 76 196 L124 196 C160 204 186 222 192 262Z" fill="${c.cloth}"/>
               <path d="M76 196 Q100 222 124 196 L130 204 Q100 236 70 204Z" fill="${c.cloth2}"/>
               <path d="M100 222 V262" stroke="#20251c" stroke-width="2"/><path d="M98 226h4M98 236h4M98 246h4" stroke="#8a8f84" stroke-width="1"/>
               <path d="M60 206 C54 230 52 246 50 262 M140 206 C146 230 148 246 150 262" stroke="#2b3226" stroke-width="2" fill="none"/>
               <path d="M84 214 L80 252 M116 214 L120 252" stroke="#c7c2b6" stroke-width="1.6" opacity=".55"/>`,
        front: `<path d="M57 100 C56 68 76 54 100 54 C126 54 146 68 143 100 C130 92 118 90 100 90 C82 90 70 92 57 100Z" fill="#26324a"/>
                <path d="M57 100 C70 92 82 90 100 90 C118 90 130 92 143 100 L143 108 C128 100 116 98 100 98 C84 98 72 100 57 108Z" fill="#1c2638"/>
                <path d="M64 70 L68 96 M76 62 L78 92 M90 57 L91 90 M104 56 L104 90 M118 58 L116 91 M131 64 L128 94" stroke="#1c2638" stroke-width="1.4" opacity=".7"/>
                <path d="M58 108 C58 120 60 128 62 132 M142 108 C142 120 140 128 138 132" stroke="${c.hair}" stroke-width="5" fill="none"/>
                <path d="M66 150 C68 176 84 194 100 196 C116 194 132 176 134 150 C128 168 118 176 100 177 C82 176 72 168 66 150Z" fill="${c.hair}" opacity=".88"/>
                <path d="M86 160 Q100 156 114 160 Q100 162 86 160Z" fill="${c.hair}"/>`
      };
    },
    stas(c) {
      return {
        back: `<path d="M56 116 C54 76 72 56 100 56 C128 56 146 76 144 116 C140 96 128 80 100 80 C72 80 60 96 56 116Z" fill="${c.hair}"/>`,
        body: `<path d="M2 262 C8 214 36 198 72 192 L128 192 C164 198 192 214 198 262Z" fill="${c.cloth}"/>
               <path d="M72 192 L60 214 L86 238 L100 206 L114 238 L140 214 L128 192 Q100 214 72 192Z" fill="#2a2b2f"/>
               <path d="M86 238 L100 206 L114 238" stroke="#3d3f44" stroke-width="2" fill="none"/>
               <path d="M100 210 L100 262" stroke="#0a0a0b" stroke-width="3"/>
               <path d="M30 230 Q40 220 56 216 M170 230 Q160 220 144 216" stroke="#3a3c42" stroke-width="2" fill="none"/>
               <path d="M74 196 C72 186 76 180 80 180 L120 180 C124 180 128 186 126 196Z" fill="${c.skin}"/>`,
        front: `<path d="M58 106 C56 72 76 58 100 58 C124 58 144 72 142 106 C136 90 120 82 100 82 C80 82 64 90 58 106Z" fill="${c.hair}" opacity=".9"/>
                <path d="M60 100 C62 80 78 66 100 66 C122 66 138 80 140 100" stroke="#4b4743" stroke-width="1" fill="none" stroke-dasharray="1 2"/>
                <path d="M74 106 L84 128 L80 150" stroke="#8a4f3c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
                <path d="M75 110 l5 -2 M78 118 l5 -2 M81 126 l5 -2" stroke="#8a4f3c" stroke-width="1.2"/>
                <path d="M68 156 C72 178 86 192 100 193 C114 192 128 178 132 156" stroke="${c.shade}" stroke-width="5" fill="none" opacity=".45"/>
                <path d="M84 142 Q92 146 92 154 M116 142 Q108 146 108 154" stroke="${c.shade}" stroke-width="1.4" fill="none" opacity=".7"/>`
      };
    },
    lena(c) {
      return {
        back: `<path d="M54 120 C46 74 70 46 100 46 C132 46 154 74 146 120 C150 150 144 176 132 186 L68 186 C56 176 50 150 54 120Z" fill="${c.hair}"/>
               <path d="M138 80 C168 82 176 122 166 160 C162 176 156 186 150 192 C154 168 156 140 150 112 C148 100 144 90 138 80Z" fill="#6a321f"/>
               <path d="M140 84 C146 82 150 86 148 92" stroke="#c94a3a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
        body: `<path d="M14 262 C20 222 44 206 78 198 L122 198 C156 206 180 222 186 262Z" fill="${c.cloth}"/>
               <path d="M78 198 Q100 216 122 198 L128 206 Q100 230 72 206Z" fill="${c.cloth2}"/>
               <path d="M86 204 Q82 236 74 262 M114 204 Q118 236 126 262" stroke="#d9d4cc" stroke-width="2" fill="none" opacity=".7"/>
               <g transform="translate(138 224) rotate(-8)"><rect x="-14" y="-9" width="28" height="18" fill="#e9e6df"/><path d="M-3 -6h6v4h4v6h-4v4h-6v-4h-4v-6h4z" fill="#c4231b"/></g>`,
        front: `<path d="M56 116 C52 78 72 56 100 56 C128 56 148 78 144 116 C138 92 124 80 108 78 C110 90 104 98 94 104 C98 94 96 86 90 82 C80 92 68 104 56 116Z" fill="${c.hair}"/>
                <path d="M62 112 C58 132 62 152 66 166 M138 112 C142 132 140 150 136 164" stroke="${c.hair}" stroke-width="4" fill="none" opacity=".9"/>
                <path d="M88 84 C80 100 76 120 78 140" stroke="#8d4a30" stroke-width="1.6" fill="none" opacity=".8"/>
                <g transform="translate(124 152) rotate(-18)"><rect x="-9" y="-4" width="18" height="8" rx="2" fill="#e7d3bd"/><path d="M-4 -4v8M0 -4v8M4 -4v8" stroke="#c9b298" stroke-width=".8"/></g>`
      };
    },
    petya(c) {
      return {
        back: `<path d="M38 150 C30 84 60 40 100 40 C140 40 170 84 162 150 C160 176 150 196 140 206 L60 206 C50 196 40 176 38 150Z" fill="${c.cloth2}"/>`,
        body: `<path d="M24 262 C28 226 46 210 74 202 L126 202 C154 210 172 226 176 262Z" fill="${c.cloth}"/>
               <path d="M62 196 C64 214 80 224 100 224 C120 224 136 214 138 196" stroke="${c.cloth2}" stroke-width="8" fill="none"/>
               <path d="M88 220 L84 252 M112 220 L116 252" stroke="#d6d2ca" stroke-width="2" opacity=".7"/>
               <circle cx="84" cy="254" r="2.5" fill="#d6d2ca"/><circle cx="116" cy="254" r="2.5" fill="#d6d2ca"/>
               <rect x="78" y="240" width="44" height="22" rx="3" fill="#3b4048"/>`,
        front: `<path d="M58 112 C56 80 74 62 100 62 C128 62 146 80 142 112 C136 100 128 94 120 92 C122 100 118 106 110 108 C112 100 108 94 102 92 C96 100 88 104 78 104 C82 98 82 94 80 92 C70 96 62 104 58 112Z" fill="${c.hair}"/>
                <path d="M44 150 C40 96 64 52 100 52 C136 52 160 96 156 150 C152 112 132 80 100 80 C68 80 48 112 44 150Z" fill="${c.cloth}"/>
                <path d="M48 140 C52 108 70 86 100 84 C130 86 148 108 152 140" stroke="${c.cloth2}" stroke-width="3" fill="none"/>
                <g fill="none" stroke="#1b1b1f" stroke-width="2.6"><circle cx="82" cy="132" r="12.5"/><circle cx="118" cy="132" r="12.5"/><path d="M94.5 131 Q100 127 105.5 131 M69.5 130 L60 126 M130.5 130 L140 126"/></g>
                <path d="M74 124 l6 -4" stroke="#fff" stroke-width="2" opacity=".5"/><path d="M110 124 l6 -4" stroke="#fff" stroke-width="2" opacity=".5"/>
                <circle cx="86" cy="152" r="1" fill="${c.shade}"/><circle cx="114" cy="150" r="1" fill="${c.shade}"/><circle cx="90" cy="156" r=".8" fill="${c.shade}"/>`
      };
    }
  };
  DETAIL.unknown = DETAIL.max;

  function portrait(id, expr, o) {
    o = o || {};
    const c = CHAR[id] || CHAR.max, e = BROWS[expr] ? expr : 'neutral', D = (DETAIL[id] || DETAIL.max)(c);
    const vb = o.crop === 'face' ? '46 58 108 108' : '0 0 200 262';
    const [bl, br] = BROWS[e];
    return `<svg class="pt e-${e} ${o.cls || ''}" data-char="${id}" data-mouth="0" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${NAMES[id] || id}, ${e}">
  <style>.m-line{fill:none;stroke:#5a2622;stroke-width:2.4;stroke-linecap:round}</style>
  ${o.crop === 'face' ? '<rect x="0" y="0" width="200" height="262" fill="#1b222b"/><circle cx="100" cy="100" r="70" fill="#273140"/>' : ''}
  <g class="breath">
    ${D.back}
    <path d="M84 176 L84 202 Q100 212 116 202 L116 176Z" fill="${c.shade}"/>
    ${D.body}
    <path d="M190 262 C186 226 166 210 140 202" class="rimlight" stroke-width="2.5" fill="none" opacity=".55"/>
    <g class="headg">
      <ellipse cx="${100 - 42 * c.jaw}" cy="134" rx="6" ry="11" fill="${c.shade}"/><ellipse cx="${100 + 42 * c.jaw}" cy="134" rx="6" ry="11" fill="${c.skin}"/>
      <path d="${facePath(c.jaw)}" fill="${c.skin}"/>
      <path d="${facePath(c.jaw)}" fill="${c.shade}" opacity=".55" style="clip-path:polygon(0 0,46% 0,40% 100%,0 100%)"/>
      <path d="M${100 + 40 * c.jaw} 100 C${100 + 43 * c.jaw} 130 ${100 + 38 * c.jaw} 160 ${100 + 18 * c.jaw} 184" class="rimlight" stroke-width="2" fill="none" opacity=".6"/>
      ${eye(82, c, e, -1)}${eye(118, c, e, 1)}
      <path d="${bl}" stroke="${id === 'stas' ? '#4f4a45' : c.hair}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="${br}" stroke="${id === 'stas' ? '#4f4a45' : c.hair}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M101 134 Q104 148 106 152 Q101 156 95 153" stroke="${c.shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M93 152 Q100 158 107 152" fill="${c.shade}" opacity=".35"/>
      <g data-m="0">${MOUTH0[e]}</g>${MOUTHS}
      ${e === 'angry' ? `<path d="M94 121 l3 6 M106 121 l-3 6" stroke="${c.shade}" stroke-width="1.4"/>` : ''}
      ${e === 'smile' ? `<ellipse cx="76" cy="152" rx="8" ry="4" fill="#d9776a" opacity=".22"/><ellipse cx="124" cy="152" rx="8" ry="4" fill="#d9776a" opacity=".22"/>` : ''}
      ${D.front}
      <g class="sweat"><path d="M138 112 q-4 7 0 10 q4 -3 0 -10z" fill="#bfe3ff" opacity=".85"/></g>
    </g>
  </g>
</svg>`;
  }

  /* ================= SCENES ================= */
  const VB = 'viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"';
  const svgL = (inner, cls) => `<svg ${VB} class="${cls || ''}" aria-hidden="true">${inner}</svg>`;

  function skyline(r, y0, h, col, lit, w0) {
    let s = '', x = -40;
    while (x < 1660) {
      const w = (w0 || 60) + r() * 90, hh = h * (.4 + r() * .6);
      s += `<rect x="${x.toFixed(0)}" y="${(y0 - hh).toFixed(0)}" width="${w.toFixed(0)}" height="${(hh + 400).toFixed(0)}" fill="${col}"/>`;
      if (r() < .25) s += `<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(y0 - hh - 30).toFixed(0)}" width="3" height="30" fill="${col}"/><circle cx="${(x + w / 2).toFixed(0)}" cy="${(y0 - hh - 30).toFixed(0)}" r="2.5" fill="#ff3b30" class="blinkL"/>`;
      if (lit) for (let wy = y0 - hh + 10; wy < y0 + 60; wy += 18) for (let wx = x + 6; wx < x + w - 8; wx += 14) {
        const q = r(); if (q < lit) s += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="6" height="8" fill="${q < lit * .3 ? '#ff9a3c' : '#ffcf7a'}" opacity="${(.3 + r() * .6).toFixed(2)}"${q < lit * .08 ? ' class="flick"' : ''}/>`;
      }
      x += w + 3;
    }
    return s;
  }
  function fire(x, y, sc) {
    return `<g transform="translate(${x} ${y}) scale(${sc})"><ellipse cx="0" cy="0" rx="70" ry="26" fill="#ff6a00" opacity=".25"/>
      <path class="fire" d="M-26 0 C-30 -30 -10 -40 -8 -70 C4 -50 10 -60 14 -84 C26 -56 34 -34 26 0Z" fill="#ff8c1a"/>
      <path class="fire" style="animation-delay:-.2s" d="M-14 0 C-16 -18 -4 -26 -2 -44 C8 -30 12 -36 14 -50 C20 -30 22 -18 14 0Z" fill="#ffd36b"/></g>`;
  }
  function smoke(x, y, n, col) {
    let s = '';
    for (let i = 0; i < n; i++) s += `<circle class="smoke" style="animation-delay:${(-i * 9 / n).toFixed(2)}s" cx="${x + i * 6}" cy="${y}" r="${30 + i * 4}" fill="${col || '#2a2726'}" opacity=".5"/>`;
    return s;
  }
  function sirens(x, y) { return `<g transform="translate(${x} ${y})"><rect x="-22" y="-6" width="20" height="10" rx="3" fill="#ff2a1f" class="siren-r"/><rect x="2" y="-6" width="20" height="10" rx="3" fill="#2a6bff" class="siren-b"/><ellipse cx="0" cy="0" rx="160" ry="60" fill="#ff2a1f" opacity=".12" class="siren-r"/><ellipse cx="0" cy="0" rx="160" ry="60" fill="#2a6bff" opacity=".12" class="siren-b"/></g>`; }
  function nightSky(id, top, bot, glow) {
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".7" stop-color="${bot}"/><stop offset="1" stop-color="${glow}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#${id})"/>`;
  }

  /* --- apartment: coordinates shared with the prep phase --- */
  const APT = {
    spots: {
      tub:      { x: 190, y: 600, r: 80, label: 'Fill the bathtub', cost: 30 },
      bottles:  { x: 585, y: 500, r: 55, label: 'Fill water bottles', cost: 20 },
      food:     { x: 810, y: 780, r: 70, label: 'Hide food under the floorboard', cost: 25 },
      glass:    { x: 1385, y: 470, r: 34, label: 'Balance a glass on the handle', cost: 5 },
      bells:    { x: 1420, y: 520, r: 34, label: 'Hang bells on the handle', cost: 10 },
      chair:    { x: 1010, y: 610, r: 60, label: 'Wedge a chair under the knob', cost: 10 },
      bag:      { x: 1275, y: 650, r: 46, label: 'Pack a go-bag with a torch', cost: 20 },
      curtains: { x: 850, y: 300, r: 90, label: 'Lights off, close the curtains', cost: 10 }
    },
    wardrobe: { x: 1060, y: 300, w: 170, h: 390, target: 1345, cost: 40 }
  };

  function wardrobe(x, cls) {
    return `<g class="${cls || ''}" transform="translate(${x} 300)">
      <rect x="0" y="0" width="170" height="390" fill="#3a2a1f"/><rect x="6" y="6" width="77" height="378" fill="#4a3627"/><rect x="87" y="6" width="77" height="378" fill="#463324"/>
      <rect x="0" y="0" width="170" height="14" fill="#2d2018"/><circle cx="78" cy="200" r="4" fill="#b08a52"/><circle cx="92" cy="200" r="4" fill="#b08a52"/>
      <path d="M14 30 L70 30 M100 30 L156 30" stroke="#5a4232" stroke-width="2"/><rect x="0" y="384" width="170" height="8" fill="#1d150f"/>
      <rect x="164" y="0" width="6" height="390" fill="#000" opacity=".25"/></g>`;
  }

  function apartment(o) {
    o = o || {};
    const r = rng(7), sk = U('ask');
    const city = svgL(nightSky(sk, '#05070b', '#16131a', '#4a2318') +
      `<g opacity=".95">${skyline(r, 640, 380, '#0b0d12', .06)}</g>${smoke(860, 520, 6, '#2b2422')}${fire(960, 600, .8)}${fire(760, 640, .5)}${sirens(840, 640)}`);
    const wall = U('aw'), fl = U('af');
    const room = svgL(`<defs>
        <linearGradient id="${wall}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#262a30"/></linearGradient>
        <linearGradient id="${fl}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2019"/><stop offset="1" stop-color="#140f0b"/></linearGradient>
        <pattern id="${wall}p" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 6 l6 12 -6 12 -6 -12z" fill="none" stroke="#fff" stroke-opacity=".03"/></pattern>
      </defs>
      <path d="M0 0 H1600 V690 H0Z M690 190 V560 H1010 V190Z" fill="url(#${wall})" fill-rule="evenodd"/>
      <path d="M0 0 H1600 V690 H0Z M690 190 V560 H1010 V190Z" fill="url(#${wall}p)" fill-rule="evenodd"/>
      <path d="M0 690 H1600 V900 H0Z" fill="url(#${fl})"/>
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${-200 + i * 140} 900 L${380 + i * 70} 690" stroke="#000" stroke-opacity=".3" stroke-width="2"/>`).join('')}
      <path d="M0 740 H1600 M0 800 H1600 M0 865 H1600" stroke="#000" stroke-opacity=".25"/>
      <rect x="0" y="676" width="1600" height="14" fill="#15110d"/>
      <!-- bathroom doorway with tub -->
      <rect x="60" y="240" width="240" height="450" fill="#101418"/><rect x="70" y="250" width="220" height="440" fill="#1f282c"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M70 ${270 + i * 46} H290" stroke="#2c393e" stroke-width="2"/>`).join('')}
      <path d="M90 560 H300 V676 H110 Q90 676 90 650Z" fill="#d9dcd8"/><path d="M98 566 H300 V590 H98Z" fill="${o.tubFull ? '#3d6a86' : '#b9bdb9'}"/>
      <path d="M130 540 v20 M124 540 h14" stroke="#9aa0a6" stroke-width="5" stroke-linecap="round"/>
      <rect x="52" y="232" width="256" height="12" fill="#0d0f12"/><rect x="52" y="232" width="12" height="458" fill="#0d0f12"/>
      <!-- kitchen -->
      <rect x="330" y="250" width="300" height="130" fill="#2f2a25"/><path d="M480 250 V380" stroke="#1c1916" stroke-width="3"/><circle cx="468" cy="330" r="3" fill="#888"/><circle cx="492" cy="330" r="3" fill="#888"/>
      <rect x="330" y="520" width="310" height="18" fill="#5b5550"/><rect x="335" y="538" width="300" height="152" fill="#2f2a25"/>
      <path d="M435 538 V690 M535 538 V690" stroke="#1c1916" stroke-width="3"/><rect x="390" y="510" width="100" height="12" fill="#8c9196"/>
      <path d="M440 470 q0 -26 22 -26 v14" stroke="#8c9196" stroke-width="6" fill="none"/>
      <g opacity="${o.bottlesFull ? 1 : .6}">${[560, 580, 600, 620].map((x, i) => `<rect x="${x - 7}" y="${470 + (i % 2) * 6}" width="14" height="${50 - (i % 2) * 6}" rx="5" fill="${o.bottlesFull ? '#4f86a8' : '#9db4c0'}" opacity=".75"/><rect x="${x - 3}" y="${462 + (i % 2) * 6}" width="6" height="9" fill="#2f6fd8"/>`).join('')}</g>
      <!-- window frame + curtains -->
      <rect x="680" y="180" width="340" height="16" fill="#e1dcd2" opacity=".85"/><rect x="680" y="554" width="340" height="18" fill="#cfc9be" opacity=".85"/>
      <rect x="680" y="180" width="14" height="392" fill="#e1dcd2" opacity=".85"/><rect x="1006" y="180" width="14" height="392" fill="#e1dcd2" opacity=".85"/><rect x="843" y="190" width="12" height="370" fill="#e1dcd2" opacity=".85"/>
      <path d="M694 380 H1006" stroke="#e1dcd2" stroke-opacity=".85" stroke-width="10"/>
      <path d="M640 160 H1060" stroke="#111" stroke-width="6"/>
      ${o.curtains
        ? `<path d="M650 164 C700 300 680 420 700 600 L850 600 C840 420 860 300 850 164Z" fill="#4a1d1a"/><path d="M1050 164 C1000 300 1020 420 1000 600 L850 600 C860 420 840 300 850 164Z" fill="#421917"/><path d="M700 200 Q720 400 710 590 M800 180 Q790 400 800 590 M900 180 Q910 400 900 590 M990 200 Q975 400 990 590" stroke="#000" stroke-opacity=".3" stroke-width="3" fill="none"/>`
        : `<path d="M640 164 C670 300 660 420 690 610 L720 610 C700 420 714 300 700 164Z" fill="#4a1d1a"/><path d="M1060 164 C1030 300 1040 420 1010 610 L980 610 C1000 420 990 300 1000 164Z" fill="#421917"/>`}
      <!-- table and chair -->
      ${o.chairAtDoor ? '' : `<g transform="translate(960 520)"><rect x="0" y="0" width="16" height="170" fill="#3b2b20"/><rect x="0" y="80" width="90" height="12" fill="#4a3627"/><rect x="74" y="92" width="10" height="78" fill="#3b2b20"/><rect x="6" y="92" width="10" height="78" fill="#3b2b20"/></g>`}
      <!-- door -->
      <rect x="1340" y="240" width="200" height="450" fill="#0e1013"/><rect x="1352" y="250" width="176" height="440" fill="#5c4632"/>
      <rect x="1370" y="280" width="140" height="160" fill="none" stroke="#3f2f21" stroke-width="4"/><rect x="1370" y="470" width="140" height="190" fill="none" stroke="#3f2f21" stroke-width="4"/>
      <circle cx="1440" cy="360" r="6" fill="#111"/><circle cx="1440" cy="360" r="3" fill="#ffcf7a" opacity=".5" class="flick f2"/>
      <rect x="1368" y="476" width="26" height="10" rx="3" fill="#b08a52"/><path d="M1500 420 q-30 20 -50 4" stroke="#999" stroke-width="3" fill="none"/>
      <text x="1440" y="232" text-anchor="middle" font-family="monospace" font-size="20" fill="#888">47</text>
      ${o.glass ? '<path d="M1374 450 h16 l-2 26 h-12z" fill="#cfe6f0" opacity=".65"/>' : ''}
      ${o.bells ? '<g><path d="M1400 486 v18" stroke="#888"/><circle cx="1400" cy="510" r="7" fill="#c9a24a"/><circle cx="1414" cy="506" r="6" fill="#c9a24a"/><circle cx="1426" cy="512" r="6" fill="#b8913c"/></g>' : ''}
      ${o.chairAtDoor ? '<g transform="translate(1388 486) rotate(-28)"><rect x="0" y="0" width="12" height="200" fill="#3b2b20"/><rect x="0" y="100" width="80" height="12" fill="#4a3627"/><rect x="68" y="112" width="10" height="80" fill="#3b2b20"/></g>' : ''}
      <!-- switch, lamp cord -->
      <rect x="1306" y="440" width="18" height="28" rx="3" fill="#cfc9be"/><rect x="1311" y="${o.lightsOff ? 456 : 446}" width="8" height="8" fill="#888"/>
      <path d="M860 0 V96" stroke="#111" stroke-width="3"/><rect x="852" y="96" width="16" height="16" fill="#222"/>
      <g class="${o.lightsOff ? '' : 'flick'}"><ellipse cx="860" cy="124" rx="10" ry="12" fill="${o.lightsOff ? '#333' : '#ffd890'}"/>${o.lightsOff ? '' : '<ellipse cx="860" cy="124" rx="300" ry="200" fill="#ffd890" opacity=".07"/>'}</g>
      ${o.noWardrobe ? '' : wardrobe(o.wardrobeAtDoor ? APT.wardrobe.target : APT.wardrobe.x)}
      ${o.bag ? '' : '<g transform="translate(1240 610)"><path d="M6 20 Q4 0 34 0 Q64 0 62 20 L66 80 H2Z" fill="#2c3a2a"/><rect x="18" y="34" width="32" height="20" rx="4" fill="#223022"/></g>'}
      <!-- floorboard -->
      <path d="M720 760 L900 760 L906 800 L714 800Z" fill="#3a2b20"/><path d="M720 760 L900 760" stroke="${o.foodHidden ? '#1c140e' : '#5a4434'}" stroke-width="3"/>`);
    const near = svgL(`<path d="M0 900 L0 720 Q40 700 60 900Z" fill="#000" opacity=".6"/><path d="M1600 900 L1600 700 Q1560 690 1540 900Z" fill="#000" opacity=".6"/>`);
    return [{ d: .15, svg: city }, { d: .5, svg: room }, { d: 1, svg: near }];
  }

  function title() {
    const r = rng(12), sk = U('tsk');
    let tower = '';
    for (let f = 0; f < 16; f++) for (let c = 0; c < 8; c++) {
      const x = 1000 + c * 52, y = 140 + f * 44, lit = f === 4 && c === 5;
      tower += `<rect x="${x}" y="${y}" width="30" height="24" fill="${lit ? '#ffcf7a' : r() < .06 ? '#ff9a3c' : '#0a0c10'}" ${lit ? 'class="flick"' : `opacity="${r() < .06 ? .5 : 1}"`}/>`;
      if (c % 2 === 0) tower += `<rect x="${x - 4}" y="${y + 24}" width="80" height="6" fill="#171b21"/>`;
    }
    return [
      { d: .1, svg: svgL(nightSky(sk, '#030406', '#151218', '#5a2a16') + smoke(400, 700, 8, '#2a2523') + smoke(1500, 760, 6, '#2a2523')) },
      { d: .25, svg: svgL(`<g>${skyline(r, 760, 360, '#0a0b0f', .05, 40)}</g>${fire(300, 770, 1)}${fire(640, 790, .6)}${sirens(500, 790)}`) },
      { d: .5, svg: svgL(`<rect x="980" y="110" width="440" height="800" fill="#101318"/><rect x="980" y="110" width="440" height="20" fill="#1a1f26"/>${tower}<path d="M1264 316 h42 v-12" stroke="#ffcf7a" stroke-width="1" opacity=".4"/><text x="1440" y="330" font-family="monospace" font-size="14" fill="#ffcf7a" opacity=".55">12</text>`) },
      { d: 1, svg: svgL(`<path d="M0 820 Q400 800 820 860 L820 900 H0Z" fill="#050608"/><g transform="translate(140 640)"><path d="M0 160 L20 40 Q30 0 70 0 H250 Q290 0 300 40 L330 160Z" fill="#08090b"/><circle cx="70" cy="170" r="34" fill="#030304"/><circle cx="270" cy="170" r="34" fill="#030304"/>${fire(150, 30, .45)}</g><path d="M-20 150 Q800 260 1640 120" stroke="#000" stroke-width="2" fill="none"/><path d="M-20 180 Q800 300 1640 160" stroke="#000" stroke-width="1.5" fill="none"/><rect x="900" y="200" width="8" height="700" fill="#050608"/><path d="M908 210 q50 0 60 20" stroke="#050608" stroke-width="6" fill="none"/><ellipse cx="968" cy="236" rx="160" ry="200" fill="#ffae42" opacity=".05" class="flick f2"/>`) }
    ];
  }

  function hall() {
    const r = rng(3);
    const doors = [44, 45, 46, 48].map((n, i) => {
      const L = i < 2, k = i % 2, x = L ? 330 - k * 150 : 1270 + k * 150, w = 110 - k * 30, h = 300 - k * 60, y = 330 + k * 40;
      const broken = n === 45;
      return `<g><rect x="${L ? x - w : x}" y="${y}" width="${w}" height="${h}" fill="${broken ? '#0a0b0d' : '#3c3128'}" ${broken ? '' : ''}/>${broken ? `<path d="M${x - w} ${y} L${x - w + 30} ${y + h} L${x - w} ${y + h}Z" fill="#3c3128"/>` : ''}<text x="${L ? x - w / 2 : x + w / 2}" y="${y - 10}" text-anchor="middle" font-family="monospace" font-size="${16 - k * 3}" fill="#777">${n}</text></g>`;
    }).join('');
    return [
      { d: .15, svg: svgL(`<rect width="1600" height="900" fill="#060708"/><rect x="740" y="330" width="120" height="160" fill="#3a1d10"/>${fire(800, 480, .5)}<rect x="740" y="330" width="120" height="160" fill="none" stroke="#111" stroke-width="10"/>`) },
      { d: .5, svg: svgL(`<path d="M0 0 L740 330 L740 490 L0 900Z" fill="#1d2126"/><path d="M1600 0 L860 330 L860 490 L1600 900Z" fill="#191c21"/><path d="M0 0 H1600 L860 330 H740Z" fill="#0f1114"/><path d="M0 900 L740 490 H860 L1600 900Z" fill="#141210"/>
        ${doors}<path d="M200 140 L230 130" stroke="#c4231b" stroke-width="10"/><text x="150" y="250" font-family="Impact,sans-serif" font-size="60" fill="#c4231b" opacity=".55" transform="rotate(8 150 250)">NO LAW</text>
        <g class="flick"><rect x="780" y="60" width="40" height="16" fill="#ff2a1f"/><ellipse cx="800" cy="70" rx="300" ry="160" fill="#ff2a1f" opacity=".1"/></g>
        ${Array.from({ length: 10 }, () => `<rect x="${(500 + r() * 600).toFixed(0)}" y="${(700 + r() * 160).toFixed(0)}" width="${(10 + r() * 40).toFixed(0)}" height="${(4 + r() * 10).toFixed(0)}" fill="#2a2420" transform="rotate(${(r() * 60 - 30).toFixed(0)} 800 780)"/>`).join('')}`) },
      { d: 1, svg: svgL(`<g class="beam"><path d="M0 820 L900 560 L900 700Z" fill="#fff6d8" opacity=".09"/></g><path d="M1500 900 V500 M1460 900 V520 M1420 900 V540" stroke="#070809" stroke-width="10"/><path d="M1380 560 L1600 470" stroke="#070809" stroke-width="12"/>`) }
    ];
  }

  function balcony() {
    const r = rng(21), sk = U('bsk');
    return [
      { d: .1, svg: svgL(nightSky(sk, '#030406', '#121019', '#5b2a18') + smoke(300, 600, 7) + smoke(1200, 640, 7)) },
      { d: .3, svg: svgL(`${skyline(r, 700, 420, '#0b0c10', .07)}${fire(380, 720, 1.2)}${fire(1180, 740, .9)}${sirens(760, 860)}${sirens(1300, 870)}`) },
      { d: .6, svg: svgL(`<rect x="1120" y="380" width="480" height="520" fill="#14171c"/><rect x="1110" y="500" width="490" height="16" fill="#1f242b"/><path d="M1110 516 V640" stroke="#0a0b0d" stroke-width="5"/>${Array.from({ length: 12 }, (_, i) => `<path d="M${1130 + i * 40} 516 V640" stroke="#0a0b0d" stroke-width="4"/>`).join('')}<rect x="1110" y="640" width="490" height="14" fill="#1f242b"/><text x="1500" y="470" font-family="monospace" font-size="20" fill="#666">46</text><rect x="1300" y="400" width="120" height="100" fill="#0a0c0e"/>`) },
      { d: 1, svg: svgL(`<rect x="-20" y="560" width="1000" height="360" fill="#0d0f12"/><rect x="-20" y="540" width="1000" height="22" fill="#2a3038"/>${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 50}" y="562" width="8" height="200" fill="#20252b"/>`).join('')}<rect x="-20" y="740" width="1000" height="20" fill="#2a3038"/><path d="M980 540 L1110 500" stroke="#ffae42" stroke-width="2" stroke-dasharray="8 10" opacity=".5"/><g class="sway"><path d="M420 0 V200" stroke="#111" stroke-width="2"/><rect x="380" y="200" width="80" height="60" fill="#3a3f45"/></g>`) }
    ];
  }

  function shaft() {
    return [
      { d: .15, svg: svgL(`<defs><radialGradient id="shg" cx=".5" cy="1" r=".8"><stop offset="0" stop-color="#2a1a10"/><stop offset="1" stop-color="#030304"/></radialGradient></defs><rect width="1600" height="900" fill="url(#shg)"/><ellipse cx="800" cy="900" rx="120" ry="40" fill="#ffae42" opacity=".18" class="flick"/>`) },
      { d: .5, svg: svgL(`<path d="M300 0 L620 900 H980 L1300 0Z" fill="#0b0c0e"/><path d="M300 0 L620 900" stroke="#1d2126" stroke-width="30"/><path d="M1300 0 L980 900" stroke="#1d2126" stroke-width="30"/>
        ${Array.from({ length: 8 }, (_, i) => { const y = i * 120, k = y / 900; return `<path d="M${300 + 320 * k} ${y} H${1300 - 320 * k}" stroke="#14171a" stroke-width="${8 - k * 5}"/>`; }).join('')}
        <g><rect x="340" y="120" width="240" height="160" fill="#1a1510" transform="skewY(14)"/><text x="400" y="230" font-family="monospace" font-size="40" fill="#ffae42" opacity=".5" transform="skewY(14)">11</text></g>
        <rect x="1060" y="420" width="170" height="110" fill="#120f0b" transform="skewY(-14)"/><text x="1100" y="500" font-family="monospace" font-size="28" fill="#ffae42" opacity=".35" transform="skewY(-14)">9</text>`) },
      { d: 1, svg: svgL(`<g class="cable"><path d="M740 -20 V920" stroke="#3a3f45" stroke-width="7"/><path d="M780 -20 V920" stroke="#30353a" stroke-width="7"/><path d="M860 -20 V920" stroke="#3a3f45" stroke-width="7"/></g><path d="M0 0 H260 L0 900Z" fill="#050506"/><path d="M1600 0 H1340 L1600 900Z" fill="#050506"/>`) }
    ];
  }

  function garage(o) {
    const r = rng(33);
    const pillars = [180, 560, 1040, 1420].map((x, i) => `<rect x="${x}" y="120" width="70" height="640" fill="#2b2f33"/><rect x="${x}" y="330" width="70" height="60" fill="#c9a227"/><text x="${x + 35}" y="372" text-anchor="middle" font-family="Impact,sans-serif" font-size="34" fill="#111">-2${String.fromCharCode(65 + i)}</text>`).join('');
    const car = (x, burnt, col) => `<g transform="translate(${x} 600)"><path d="M0 120 L10 60 Q20 30 70 26 L120 0 H240 L290 30 Q330 36 340 70 L350 120Z" fill="${burnt ? '#141210' : col}"/><path d="M128 10 H230 L270 34 H100Z" fill="${burnt ? '#050505' : '#0e1419'}"/><circle cx="70" cy="122" r="28" fill="#070707"/><circle cx="280" cy="122" r="28" fill="#070707"/>${burnt ? '<path d="M40 40 l40 -30 M200 0 l20 -40" stroke="#222" stroke-width="10"/>' : '<rect x="330" y="70" width="18" height="10" fill="#ffcf7a" opacity=".2"/>'}</g>`;
    return [
      { d: .15, svg: svgL(`<rect width="1600" height="900" fill="#08090a"/><path d="M500 300 H1100 L1300 900 H300Z" fill="#0d0f10"/><rect x="700" y="260" width="200" height="120" fill="#14100a"/><text x="800" y="330" text-anchor="middle" font-family="Impact,sans-serif" font-size="30" fill="#ffae42" opacity=".5">EXIT ↑</text>`) },
      { d: .5, svg: svgL(`<rect x="0" y="0" width="1600" height="120" fill="#111315"/>${Array.from({ length: 6 }, (_, i) => `<g class="${i === 2 ? 'flick' : i === 4 ? 'flick f2' : ''}"><rect x="${120 + i * 260}" y="96" width="140" height="10" fill="${i === 1 ? '#222' : '#dfe8e0'}"/>${i === 1 ? '' : `<path d="M${120 + i * 260} 106 L${40 + i * 260} 760 H${340 + i * 260} L${260 + i * 260} 106Z" fill="#dfe8e0" opacity=".035"/>`}</g>`).join('')}
        <rect x="0" y="760" width="1600" height="140" fill="#17191b"/>${pillars}${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 220} 860 L${i * 220 + 120} 780" stroke="#c9a227" stroke-width="5" opacity=".35"/>`).join('')}
        ${car(260, true)}${car(860, false, '#2c3d4c')}<g transform="translate(1180 470)"><rect x="0" y="0" width="420" height="270" fill="#2b4a3a"/><rect x="20" y="30" width="380" height="80" fill="#0c1310"/><text x="200" y="160" text-anchor="middle" font-family="Impact,sans-serif" font-size="30" fill="#c9d2c4" opacity=".4">ROUTE 12</text><circle cx="80" cy="270" r="34" fill="#070707"/><circle cx="340" cy="270" r="34" fill="#070707"/></g>`) },
      { d: 1, svg: svgL(`${o && o.beams ? '<g class="beam"><path d="M1600 300 L600 760 L760 900Z" fill="#fff6d8" opacity=".08"/></g>' : ''}<path d="M0 0 H1600 V40 H0Z" fill="#050506"/><path d="M60 0 V900" stroke="#060607" stroke-width="40"/>${Array.from({ length: 5 }, () => `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(820 + r() * 60).toFixed(0)}" r="${(20 + r() * 40).toFixed(0)}" fill="#1d1f22" opacity=".6"/>`).join('')}`) }
    ];
  }

  function sewer(o) {
    const g = U('swg');
    const arches = Array.from({ length: 6 }, (_, i) => { const k = 1 - i * .16, w = 900 * k, h = 700 * k, cy = 520; return `<path d="M${800 - w / 2} ${cy + h * .4} V${cy - h * .2} Q800 ${cy - h * .95} ${800 + w / 2} ${cy - h * .2} V${cy + h * .4}" stroke="#2a2420" stroke-width="${18 * k}" fill="none" opacity="${.9 - i * .12}"/>`; }).join('');
    return [
      { d: .15, svg: svgL(`<defs><radialGradient id="${g}" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="${o && o.dawn ? '#ffd9a0' : '#1a1d17'}"/><stop offset="1" stop-color="#040504"/></radialGradient></defs><rect width="1600" height="900" fill="url(#${g})"/>${o && o.dawn ? '<ellipse cx="800" cy="520" rx="140" ry="160" fill="#fff4d6" opacity=".9"/><path d="M660 560 Q800 520 940 560 L940 700 H660Z" fill="#7aa0b0" opacity=".7"/><circle cx="830" cy="470" r="40" fill="#ffefc2"/>' : ''}`) },
      { d: .5, svg: svgL(`<rect width="1600" height="900" fill="#0e0f0c" opacity="${o && o.dawn ? .0 : 0}"/>${arches}
        <path d="M0 640 L640 560 H960 L1600 640 V900 H0Z" fill="#141612"/><path d="M200 900 L700 570 H900 L1400 900Z" fill="#23301f"/><path d="M200 900 L700 570 H900 L1400 900Z" fill="#3a5a4a" opacity=".35"/>
        <ellipse class="ripple" cx="760" cy="760" rx="40" ry="10" fill="none" stroke="#9fb8a8" stroke-width="2"/><ellipse class="ripple" style="animation-delay:-1.2s" cx="980" cy="820" rx="40" ry="10" fill="none" stroke="#9fb8a8" stroke-width="2"/>
        <path d="M120 200 H500 M1100 260 H1520" stroke="#2c3a34" stroke-width="22"/><path d="M500 200 q30 0 30 40 V560" stroke="#2c3a34" stroke-width="22" fill="none"/>
        <circle class="drip" cx="530" cy="560" r="4" fill="#9fb8a8"/><circle class="drip" style="animation-delay:-1s" cx="1180" cy="300" r="4" fill="#9fb8a8"/>`) },
      { d: 1, svg: svgL(`${o && o.grate ? '<g><path d="M700 0 L560 900 H1040 L900 0Z" fill="#dfe8ff" opacity=".07"/>' + Array.from({ length: 6 }, (_, i) => `<path d="M${700 + i * 40} 0 L${560 + i * 96} 900" stroke="#000" stroke-opacity=".3" stroke-width="10"/>`).join('') + '</g>' : ''}<path d="M0 0 Q200 300 120 900 H0Z" fill="#050605"/><path d="M1600 0 Q1400 300 1480 900 H1600Z" fill="#050605"/>`) }
    ];
  }

  function bunker() {
    return [
      { d: .15, svg: svgL(`<rect width="1600" height="900" fill="#0b0c0a"/><rect x="0" y="0" width="1600" height="900" fill="#c4231b" opacity=".06" class="flick f2"/>`) },
      { d: .5, svg: svgL(`<rect x="0" y="0" width="1600" height="720" fill="#1c1f1b"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 220} 0 V720" stroke="#141613" stroke-width="6"/>`).join('')}<rect x="0" y="720" width="1600" height="180" fill="#121410"/>
        <g transform="translate(800 400)"><circle r="230" fill="#2c302a"/><circle r="200" fill="#3a3f37"/><circle r="200" fill="none" stroke="#22251f" stroke-width="10"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${Math.cos(i * Math.PI / 6) * 214}" cy="${Math.sin(i * Math.PI / 6) * 214}" r="8" fill="#22251f"/>`).join('')}<g class="${'wheel'}"><circle r="70" fill="none" stroke="#7a2a20" stroke-width="12"/><path d="M-70 0 H70 M0 -70 V70 M-50 -50 L50 50 M50 -50 L-50 50" stroke="#7a2a20" stroke-width="10"/></g></g>
        <path d="M480 640 L1120 640" stroke="#c9a227" stroke-width="16" stroke-dasharray="40 40"/>
        <g transform="translate(120 360)"><rect width="260" height="20" fill="#3a3f37"/><rect y="140" width="260" height="20" fill="#3a3f37"/><rect y="0" width="12" height="360" fill="#2a2e27"/><rect x="248" y="0" width="12" height="360" fill="#2a2e27"/><rect x="10" y="-30" width="240" height="30" fill="#55604a"/><rect x="10" y="110" width="240" height="30" fill="#55604a"/></g>
        <g transform="translate(1260 300)"><rect width="200" height="300" fill="#262a23"/>${Array.from({ length: 4 }, (_, i) => `<rect x="0" y="${i * 75}" width="200" height="8" fill="#3a3f37"/><rect x="${10 + i * 7}" y="${i * 75 + 20}" width="40" height="55" fill="#4f5a3a"/><rect x="${70 + i * 5}" y="${i * 75 + 30}" width="30" height="45" fill="#6b5a3a"/>`).join('')}</g>
        <g transform="translate(1100 330)"><rect width="60" height="90" fill="#2a2e27"/><circle cx="30" cy="30" r="14" fill="#111"/><rect x="18" y="58" width="24" height="10" fill="#c4231b" class="blinkL"/></g>
        <text x="800" y="120" text-anchor="middle" font-family="Impact,sans-serif" font-size="44" fill="#c9a227" opacity=".5">УБЕЖИЩЕ № 3</text>`) },
      { d: 1, svg: svgL(`<g class="flick"><rect x="760" y="10" width="80" height="30" fill="#ff2a1f"/><ellipse cx="800" cy="30" rx="500" ry="280" fill="#ff2a1f" opacity=".08"/></g><path d="M0 0 H1600 V30 H0Z" fill="#070807"/><path d="M0 900 V760 Q100 740 160 900Z" fill="#050605"/>`) }
    ];
  }

  const SCENES = { title, apartment, hall, balcony, shaft, garage, sewer, bunker, dawn: o => sewer(Object.assign({}, o, { dawn: true })) };
  const LOC_NAME = { title: '', apartment: 'Apt 47 · Floor 12', hall: 'Corridor · Floor 12', balcony: 'Balcony · Floor 12', shaft: 'Elevator shaft', garage: 'Garage · Level -2', sewer: 'Storm sewer', bunker: 'Shelter No. 3', dawn: 'River outfall' };
  const RIM = { title: '#ffae42', apartment: '#ffcf7a', hall: '#ff3b30', balcony: '#ff7a3c', shaft: '#ffae42', garage: '#cfe8d8', sewer: '#9fd3b8', bunker: '#ff3b30', dawn: '#ffe2b0' };

  function scene(loc, o) {
    const layers = (SCENES[loc] || SCENES.apartment)(o || {});
    return { html: `<div class="world"><div class="cam">${layers.map(l => `<div class="layer" data-d="${l.d}">${l.svg}</div>`).join('')}</div></div>`, name: LOC_NAME[loc] || '', rim: RIM[loc] || '#ffae42' };
  }

  return { portrait, scene, APT, wardrobe, NAMES, CHAR };
})();
