/* Hatille digital products: Personal Colour Palette Guide, Swatch Card & Fan, Bride's Alteration & Wedding Planner.
   PDFs are built in the buyer's browser with jsPDF (vector text and colour, printable at any size).
   Needs: assets/vendor/jspdf.umd.min.js, assets/colour.js (SEASONS), assets/guides.js (SEASON_GUIDE), assets/data.js (ALTERATIONS). */
(function () {
  const C = { ink: '#1c1915', gold: '#b08d57', goldL: '#d4b47e', goldD: '#8a6a32', ivory: '#faf6ef', beige: '#efe6d8', muted: '#6b645b', line: '#d9cdb8', black: '#0c0b0a', white: '#ffffff' };
  const W = 215.9, H = 279.4, M = 18;   // US Letter in mm

  /* ---------- setup ---------- */
  let libP = null;
  function loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src.endsWith(src))) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function fontB64(url) { const b = await fetch(url).then(r => { if (!r.ok) throw new Error('font ' + url); return r.arrayBuffer(); }); let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function libs() {
    return libP || (libP = (async () => {
      if (!window.jspdf) await loadScript('/assets/vendor/jspdf.umd.min.js');
      const f = await Promise.all(['Poppins-Light', 'Poppins-Regular', 'Poppins-Medium', 'Lora-Italic'].map(n => fontB64('/assets/fonts/' + n + '.ttf')));
      return { jsPDF: window.jspdf.jsPDF, fonts: f };
    })());
  }
  async function newDoc(title) {
    const { jsPDF, fonts } = await libs();
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'p', compress: true });
    [['Poppins-Light', 'Poppins', 'light'], ['Poppins-Regular', 'Poppins', 'normal'], ['Poppins-Medium', 'Poppins', 'medium'], ['Lora-Italic', 'Lora', 'italic']].forEach(([f, fam, st], i) => { doc.addFileToVFS(f + '.ttf', fonts[i]); doc.addFont(f + '.ttf', fam, st); });
    doc.setProperties({ title, author: 'Hatille', creator: 'hatille.com', subject: title });
    return doc;
  }

  /* ---------- drawing helpers ---------- */
  const lum = h => { const n = parseInt(h.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const on = h => lum(h) > 0.6 ? C.ink : C.white;
  function T(doc, str, x, y, o = {}) {
    doc.setFont(o.font || 'Poppins', o.style || 'light'); doc.setFontSize(o.size || 10); doc.setTextColor(o.color || C.ink);
    const opt = { align: o.align || 'left', baseline: o.baseline || 'alphabetic' }; if (o.max) opt.maxWidth = o.max; if (o.space) opt.charSpace = o.space;
    doc.text(o.upper ? String(str).toUpperCase() : String(str), x, y, opt);
  }
  function para(doc, str, x, y, max, o = {}) {
    doc.setFont(o.font || 'Poppins', o.style || 'light'); doc.setFontSize(o.size || 10);
    const lines = doc.splitTextToSize(str, max); const lh = (o.size || 10) * 0.3528 * (o.lh || 1.55);
    lines.forEach((l, i) => T(doc, l, x, y + i * lh, o)); return y + lines.length * lh;
  }
  const eyebrow = (doc, s, x, y, color) => T(doc, s, x, y, { size: 7.5, style: 'medium', color: color || C.gold, upper: true, space: 0.9 });
  function rule(doc, x1, y, x2, color, w) { doc.setDrawColor(color || C.line); doc.setLineWidth(w || 0.25); doc.line(x1, y, x2, y); }
  function bg(doc, color) { doc.setFillColor(color); doc.rect(0, 0, W, H, 'F'); }
  function chrome(doc, label, n, dark) {
    T(doc, 'HATILLE', M, 13, { size: 9, style: 'light', color: dark ? C.goldL : C.gold, space: 1.6 });
    T(doc, label, W - M, 13, { size: 7, style: 'regular', color: dark ? '#a39d94' : C.muted, align: 'right', upper: true, space: 0.7 });
    rule(doc, M, H - 14, W - M, dark ? '#3a352f' : C.line);
    T(doc, 'hatille.com', M, H - 9, { size: 7, color: dark ? '#a39d94' : C.muted, space: 0.3 });
    if (n) T(doc, String(n), W - M, H - 9, { size: 7, color: dark ? '#a39d94' : C.muted, align: 'right' });
  }
  function chip(doc, hex, x, y, w, h, name, o = {}) {
    doc.setFillColor(hex); doc.rect(x, y, w, h, 'F');
    if (lum(hex) > 0.92) { doc.setDrawColor(C.line); doc.setLineWidth(0.2); doc.rect(x, y, w, h, 'S'); }
    if (name && !o.below) { T(doc, name, x + 2.2, y + h - 5.2, { size: o.fs || 7, style: 'medium', color: on(hex) }); T(doc, hex.toUpperCase(), x + 2.2, y + h - 2.2, { size: 5.6, color: on(hex) }); }
    if (name && o.below) { T(doc, name, x, y + h + 3.8, { size: o.fs || 6.8, style: 'regular' }); T(doc, hex.toUpperCase(), x, y + h + 6.8, { size: 5.6, color: C.muted }); }
  }
  function cropMarks(doc, x, y, w, h) {
    doc.setDrawColor('#9a948c'); doc.setLineWidth(0.15); const k = 3, g = 1.2;
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => { const sx = px === x ? -1 : 1, sy = py === y ? -1 : 1; doc.line(px + sx * g, py, px + sx * (g + k), py); doc.line(px, py + sy * g, px, py + sy * (g + k)); });
  }
  function dashedRect(doc, x, y, w, h) { doc.setDrawColor('#9a948c'); doc.setLineWidth(0.15); doc.setLineDashPattern([1.2, 1], 0); doc.rect(x, y, w, h, 'S'); doc.setLineDashPattern([], 0); }
  const today = () => new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ---------- Swatch card & fan pages (shared) ---------- */
  function swatchCardPage(doc, season, G, name, n) {
    bg(doc, C.white); chrome(doc, 'Swatch card · ' + season, n);
    eyebrow(doc, 'Your wallet swatch card', M, 30);
    T(doc, 'Take your colours shopping.', M, 42, { size: 20, style: 'light' });
    para(doc, 'Print on matte card stock (65–110 lb / 175–300 gsm) at 100% size. Cut along the marks, fold along the dashed line, and glue the halves together. Hold fabrics next to the swatches in daylight before you buy.', M, 50, W - 2 * M, { size: 8.5, color: C.muted });
    const cw = 85.6, ch = 54, gap = 14;   // credit-card size
    const all = G.colours.slice(0, 16), neu = G.neutrals;
    for (let k = 0; k < 2; k++) {
      const x = M + (k ? cw + gap : 0), y = 74;
      // front (top half) and back (bottom half), fold in the middle
      cropMarks(doc, x, y, cw, ch * 2);
      doc.setFillColor(C.black); doc.rect(x, y, cw, ch, 'F');
      T(doc, 'HATILLE', x + 6, y + 9, { size: 8, color: C.goldL, space: 1.6 });
      T(doc, season, x + 6, y + 21, { size: 15, font: 'Lora', style: 'italic', color: C.white });
      T(doc, name ? 'Colour card for ' + name : 'Your colour card', x + 6, y + 27, { size: 6.5, color: '#cfc8bc' });
      const sw = (cw - 12) / 8; neu.concat(all.slice(0, 2)).slice(0, 8).forEach((c, i) => { doc.setFillColor(c[0]); doc.rect(x + 6 + i * sw, y + 34, sw, 10, 'F'); });
      T(doc, 'Neutrals', x + 6, y + 49, { size: 5.5, color: '#a39d94', upper: true, space: 0.5 });
      doc.setDrawColor('#9a948c'); doc.setLineDashPattern([1.2, 1], 0); doc.setLineWidth(0.15); doc.line(x - 4, y + ch, x + cw + 4, y + ch); doc.setLineDashPattern([], 0);
      T(doc, 'fold', x + cw + 4.5, y + ch + 1, { size: 5, color: '#9a948c' });
      // back: 16 colours, upside down so it reads correctly after folding
      const cols = 4, rows = 4, bw = (cw - 8) / cols, bh = (ch - 12) / rows;
      all.forEach((c, i) => { const cx = x + 4 + (i % cols) * bw, cy = y + ch + 4 + Math.floor(i / cols) * bh; doc.setFillColor(c[0]); doc.rect(cx, cy, bw - 0.8, bh - 0.8, 'F'); });
      T(doc, G.metals.split(',')[0] + ' · ' + G.traits.split('·')[0].trim(), x + cw / 2, y + ch * 2 - 2.5, { size: 5.5, color: C.muted, align: 'center' });
    }
    T(doc, 'Tip: screens and printers show colour differently. For the truest colours, print at a photo or print shop on matte card.', M, H - 22, { size: 7, color: C.muted, max: W - 2 * M });
  }
  function swatchFanPages(doc, season, G, name, n0) {
    const all = G.neutrals.concat(G.colours);           // 22 colours
    const nb = 5, blades = []; let at = 0;
    for (let i = 0; i < nb; i++) { const k = Math.ceil((all.length - at) / (nb - i)); blades.push(all.slice(at, at + k)); at += k; }
    const per = Math.max(...blades.map(b => b.length));
    const bw = 30, bh = 200, gap = 4, perPage = 5; let n = n0;
    for (let p = 0; p * perPage < blades.length; p++) {
      doc.addPage(); bg(doc, C.white); chrome(doc, 'Swatch fan · ' + season, n++);
      eyebrow(doc, p ? 'Swatch fan · continued' : 'Your swatch fan', M, 26);
      if (!p) para(doc, 'Cut out each blade along the dashed lines. Stack them in order, punch the circles and join with a split pin or a book ring. Fan them out next to clothes, fabric or makeup.', M, 32, W - 2 * M, { size: 8, color: C.muted });
      const y0 = p ? 34 : 44;
      blades.slice(p * perPage, p * perPage + perPage).forEach((b, i) => {
        const x = M + i * (bw + gap); dashedRect(doc, x, y0, bw, bh);
        doc.setFillColor(C.black); doc.rect(x, y0, bw, 22, 'F');
        T(doc, 'HATILLE', x + bw / 2, y0 + 8, { size: 6, color: C.goldL, align: 'center', space: 1 });
        T(doc, season, x + bw / 2, y0 + 15.5, { size: 8.5, font: 'Lora', style: 'italic', color: C.white, align: 'center' });
        const sh = (bh - 22 - 22) / b.length;
        b.forEach((c, k) => { const y = y0 + 22 + k * sh; doc.setFillColor(c[0]); doc.rect(x, y, bw, sh, 'F'); T(doc, c[1], x + 2.5, y + sh - 6, { size: 7, style: 'medium', color: on(c[0]), max: bw - 4 }); T(doc, c[0].toUpperCase(), x + 2.5, y + sh - 2.5, { size: 5.5, color: on(c[0]) }); });
        doc.setDrawColor('#9a948c'); doc.setLineWidth(0.25); doc.circle(x + bw / 2, y0 + bh - 9, 2.2, 'S');
        T(doc, `${p * perPage + i + 1} / ${blades.length}`, x + bw / 2, y0 + bh - 2.5, { size: 5.5, color: C.muted, align: 'center' });
      });
    }
    return n;
  }

  /* ---------- Personal Colour Palette Guide ---------- */
  async function paletteGuide({ season, name }) {
    const G = SEASON_GUIDE[season], S = SEASONS[season]; if (!G) throw new Error('Unknown season');
    const doc = await newDoc(`Hatille Personal Colour Palette · ${season}`);
    // 1 cover
    bg(doc, C.black);
    T(doc, 'H A T I L L E', W / 2, 40, { size: 16, color: C.goldL, align: 'center' });
    rule(doc, W / 2 - 18, 48, W / 2 + 18, C.gold, 0.3);
    T(doc, 'Personal Colour Palette', W / 2, 92, { size: 13, color: '#cfc8bc', align: 'center', upper: true, space: 2.2 });
    T(doc, season, W / 2, 122, { size: 46, font: 'Lora', style: 'italic', color: C.white, align: 'center' });
    T(doc, G.traits, W / 2, 136, { size: 9, color: C.goldL, align: 'center' });
    const strip = G.colours.slice(0, 12), sw = (W - 2 * 30) / strip.length;
    strip.forEach((c, i) => { doc.setFillColor(c[0]); doc.rect(30 + i * sw, 158, sw + 0.2, 34, 'F'); });
    if (name) { T(doc, 'Prepared for', W / 2, 220, { size: 8, color: '#a39d94', align: 'center', upper: true, space: 1.2 }); T(doc, name, W / 2, 232, { size: 22, font: 'Lora', style: 'italic', color: C.white, align: 'center' }); }
    T(doc, today() + ' · hatille.com', W / 2, H - 20, { size: 8, color: '#a39d94', align: 'center' });
    // 2 your season
    doc.addPage(); bg(doc, C.ivory); chrome(doc, 'Your season', 2);
    eyebrow(doc, 'Welcome to your season', M, 34);
    T(doc, season, M, 54, { size: 34, font: 'Lora', style: 'italic', color: C.ink });
    T(doc, G.traits, M, 63, { size: 9.5, color: C.goldD });
    let y = para(doc, G.look, M, 78, 118, { size: 11.5, lh: 1.6 });
    y = para(doc, S.desc, M, y + 4, 118, { size: 10, color: C.muted });
    const box = (lab, val, yy) => { eyebrow(doc, lab, 145, yy); return para(doc, val, 145, yy + 6, W - M - 145, { size: 9.5 }); };
    let yy = box('Best metals', G.metals, 78); yy = box('White & black', G.whiteBlack, yy + 8); yy = box('Hair', G.hair, yy + 8);
    rule(doc, M, 176, W - M);
    eyebrow(doc, 'How to use your palette', M, 188);
    const steps = [['Wear it near your face', 'Your best colours matter most in tops, scarves, collars and jackets. Trousers and shoes can be any neutral.'], ['Build on neutrals', 'Choose coats, bags and basics from your neutrals, then add 1–2 colours from your palette.'], ['Shop with your fan', 'Hold the swatch fan or card next to a garment in daylight. If it blends or harmonises, it\'s a yes.'], ['Same colour, your version', 'Love a colour outside your palette? Look for your version of it: softer, brighter, warmer or cooler.']];
    steps.forEach(([h, p], i) => { const x = M + (i % 2) * ((W - 2 * M) / 2 + 3), y2 = 198 + Math.floor(i / 2) * 32; T(doc, `0${i + 1}`, x, y2, { size: 8, style: 'medium', color: C.gold }); T(doc, h, x + 9, y2, { size: 10.5, style: 'regular' }); para(doc, p, x + 9, y2 + 6, (W - 2 * M) / 2 - 14, { size: 8.5, color: C.muted }); });
    // 3 your palette
    doc.addPage(); bg(doc, C.white); chrome(doc, 'Your palette', 3);
    eyebrow(doc, 'Your palette', M, 30); T(doc, 'The colours that light you up.', M, 42, { size: 20 });
    const gw = (W - 2 * M - 3 * 4) / 4, gh = 30;
    G.colours.forEach((c, i) => chip(doc, c[0], M + (i % 4) * (gw + 4), 52 + Math.floor(i / 4) * (gh + 4), gw, gh, c[1], { fs: 7.5 }));
    eyebrow(doc, 'Your neutrals', M, 199); T(doc, 'The base of your wardrobe: coats, trousers, bags and shoes.', M, 205, { size: 8.5, color: C.muted });
    const nw = (W - 2 * M - 5 * 4) / 6; G.neutrals.forEach((c, i) => chip(doc, c[0], M + i * (nw + 4), 211, nw, 30, c[1], { fs: 6.8 }));
    // 4 avoid + makeup
    doc.addPage(); bg(doc, C.ivory); chrome(doc, 'Beauty & colours to skip', 4);
    eyebrow(doc, 'Colours to wear away from your face', M, 30); T(doc, 'Skip these near your face.', M, 42, { size: 20 });
    para(doc, 'These shades fight with your natural colouring and can make skin look tired or uneven. If you love one, wear it on the bottom half or as a small accent.', M, 50, W - 2 * M, { size: 9, color: C.muted });
    const aw = (W - 2 * M - 5 * 4) / 6; G.avoid.forEach((c, i) => { chip(doc, c[0], M + i * (aw + 4), 62, aw, 24, null); doc.setDrawColor(C.ink); doc.setLineWidth(0.35); doc.line(M + i * (aw + 4) + aw - 7, 65, M + i * (aw + 4) + aw - 3, 69); doc.line(M + i * (aw + 4) + aw - 3, 65, M + i * (aw + 4) + aw - 7, 69); T(doc, c[1], M + i * (aw + 4), 90, { size: 7 }); });
    rule(doc, M, 102, W - M);
    eyebrow(doc, 'Your makeup colours', M, 114);
    const mk = [['Lips', G.lips], ['Cheeks', G.blush], ['Eyes', G.eyes]];
    mk.forEach(([lab, arr], i) => { const x = M + i * 61; T(doc, lab, x, 124, { size: 11, style: 'regular' }); arr.forEach((c, k) => { doc.setFillColor(c[0]); doc.circle(x + 6, 134 + k * 15, 5, 'F'); T(doc, c[1], x + 14, 135.5 + k * 15, { size: 8.5 }); }); });
    rule(doc, M, 184, W - M);
    eyebrow(doc, 'Hair & accessories', M, 196);
    let y4 = para(doc, 'Hair: ' + G.hair, M, 206, W - 2 * M, { size: 10 }); y4 = para(doc, 'Jewellery & metals: ' + G.metals + '.', M, y4 + 3, W - 2 * M, { size: 10 });
    para(doc, 'Glasses and sunglasses: choose frames in your neutrals or metals so they frame your face instead of competing with it.', M, y4 + 3, W - 2 * M, { size: 10 });
    // 5 style & outfits
    doc.addPage(); bg(doc, C.white); chrome(doc, 'Style it', 5);
    eyebrow(doc, 'Style it', M, 30); T(doc, 'Outfit formulas in your colours.', M, 42, { size: 20 });
    const pool = G.colours.concat(G.neutrals), find = word => { const w = word.toLowerCase(); return pool.find(c => w.includes(c[1].toLowerCase())) || null; };
    G.outfits.forEach((o, i) => {
      const y5 = 56 + i * 44; doc.setFillColor(C.ivory); doc.rect(M, y5, W - 2 * M, 38, 'F');
      T(doc, `Look 0${i + 1}`, M + 6, y5 + 9, { size: 7.5, style: 'medium', color: C.gold, upper: true, space: 0.8 });
      para(doc, o, M + 6, y5 + 17, 105, { size: 11, font: 'Lora', style: 'italic' });
      const cs = o.split(',').map(find).filter(Boolean).slice(0, 4); const use = cs.length >= 2 ? cs : [G.neutrals[0], G.colours[i * 2], G.colours[i * 2 + 1]];
      use.forEach((c, k) => { doc.setFillColor(c[0]); doc.rect(W - M - 6 - (use.length - k) * 17, y5 + 6, 15, 26, 'F'); if (lum(c[0]) > 0.92) { doc.setDrawColor(C.line); doc.rect(W - M - 6 - (use.length - k) * 17, y5 + 6, 15, 26, 'S'); } });
    });
    eyebrow(doc, 'Prints & patterns', M, 196); para(doc, G.prints, M, 204, W - 2 * M, { size: 10 });
    eyebrow(doc, 'A note from Hatille', M, 228); para(doc, 'Colour is a tool, not a rule. Use your palette to make getting dressed easier, and keep wearing anything that makes you feel like yourself. For a live draping session or a full wardrobe plan, book a consultation at hatille.com/book.', M, 236, W - 2 * M, { size: 9.5, color: C.muted });
    // 6 card + fan
    doc.addPage(); swatchCardPage(doc, season, G, name, 6);
    swatchFanPages(doc, season, G, name, 7);
    return doc;
  }

  /* ---------- Swatch Card & Fan only ---------- */
  async function swatchSet({ season, name }) {
    const G = SEASON_GUIDE[season]; if (!G) throw new Error('Unknown season');
    const doc = await newDoc(`Hatille Swatch Card & Fan · ${season}`);
    bg(doc, C.black);
    T(doc, 'H A T I L L E', W / 2, 40, { size: 16, color: C.goldL, align: 'center' });
    T(doc, 'Swatch Card & Fan', W / 2, 92, { size: 13, color: '#cfc8bc', align: 'center', upper: true, space: 2.2 });
    T(doc, season, W / 2, 122, { size: 44, font: 'Lora', style: 'italic', color: C.white, align: 'center' });
    const all = G.neutrals.concat(G.colours), sw = (W - 60) / 11;
    all.forEach((c, i) => { doc.setFillColor(c[0]); doc.rect(30 + (i % 11) * sw, 150 + Math.floor(i / 11) * 22, sw + 0.2, 22, 'F'); });
    if (name) T(doc, 'For ' + name, W / 2, 222, { size: 18, font: 'Lora', style: 'italic', color: C.white, align: 'center' });
    T(doc, 'Print on matte card stock at 100% size · hatille.com', W / 2, H - 20, { size: 8, color: '#a39d94', align: 'center' });
    doc.addPage(); swatchCardPage(doc, season, G, name, 2);
    swatchFanPages(doc, season, G, name, 3);
    return doc;
  }

  /* ---------- Bride's Alteration & Wedding Planner (fillable) ---------- */
  async function bridalPlanner({ bride, date }) {
    const doc = await newDoc("Hatille Bride's Alteration & Wedding Planner");
    const J = window.jspdf; let fid = 0;
    const field = (x, y, w, h, o = {}) => {
      try { const f = new J.AcroFormTextField(); f.fieldName = 'f' + (++fid); f.Rect = [x, y, w, h]; f.fontSize = o.fs || 9; f.multiline = !!o.multi; f.textColor = '#1c1915'; f.borderStyle = 'underline'; if (o.value) f.value = o.value; doc.addField(f); } catch (e) {}
      doc.setDrawColor(C.line); doc.setLineWidth(0.3); if (o.box) doc.rect(x, y, w, h, 'S'); else doc.line(x, y + h, x + w, y + h);
    };
    const check = (x, y, label, o = {}) => {
      doc.setDrawColor(C.gold); doc.setLineWidth(0.3); doc.rect(x, y - 3.2, 3.6, 3.6, 'S');
      try { const c = new J.AcroFormCheckBox(); c.fieldName = 'c' + (++fid); c.Rect = [x, y - 3.2, 3.6, 3.6]; c.appearanceState = 'Off'; doc.addField(c); } catch (e) {}
      T(doc, label, x + 6, y, { size: o.size || 9, max: o.max || 160 });
    };
    const page = (label, n, color) => { doc.addPage(); bg(doc, color || C.ivory); chrome(doc, label, n); };
    const head = (eb, title, y) => { eyebrow(doc, eb, M, y || 30); T(doc, title, M, (y || 30) + 12, { size: 20 }); };
    // 1 cover
    bg(doc, C.ivory);
    doc.setDrawColor(C.gold); doc.setLineWidth(0.4); doc.rect(12, 12, W - 24, H - 24, 'S'); doc.setLineWidth(0.15); doc.rect(14.5, 14.5, W - 29, H - 29, 'S');
    T(doc, 'H A T I L L E', W / 2, 46, { size: 15, color: C.gold, align: 'center' });
    T(doc, "The Bride's", W / 2, 104, { size: 30, font: 'Lora', style: 'italic', color: C.goldD, align: 'center' });
    T(doc, 'Alteration & Wedding', W / 2, 122, { size: 24, color: C.ink, align: 'center' });
    T(doc, 'Planner', W / 2, 136, { size: 24, color: C.ink, align: 'center' });
    rule(doc, W / 2 - 20, 150, W / 2 + 20, C.gold, 0.3);
    if (bride) T(doc, bride, W / 2, 178, { size: 20, font: 'Lora', style: 'italic', align: 'center' });
    if (date) T(doc, date, W / 2, 190, { size: 10, color: C.muted, align: 'center', upper: true, space: 1.2 });
    T(doc, 'Fittings · budget · bustle guide · checklists · day-of timeline', W / 2, H - 34, { size: 8.5, color: C.muted, align: 'center' });
    T(doc, 'Fill it in on screen or print it · hatille.com', W / 2, H - 27, { size: 7.5, color: C.muted, align: 'center' });
    // 2 contents
    page('Welcome', 2, C.white); head('Welcome', 'Your gown, your day, all in one place.');
    para(doc, 'This planner walks you through everything that happens to your wedding dress, from the day you say yes to the dress to preserving it afterwards, plus the wedding checklists that keep the rest of your planning calm. Type straight into the fields on a computer or tablet, or print the pages you need.', M, 52, W - 2 * M, { size: 10.5, lh: 1.6 });
    const toc = ['Wedding at a glance', 'Your alteration timeline', 'Fitting tracker', 'What to bring & what to ask', 'Alteration costs & budget', 'Bustle guide', '12-month wedding checklist', 'Vendor contacts', 'Wedding budget', 'Day-of timeline', 'Emergency kit & gown care', 'Notes'];
    toc.forEach((t, i) => { const y = 88 + i * 13; T(doc, String(i + 3).padStart(2, '0'), M, y, { size: 9, style: 'medium', color: C.gold }); T(doc, t, M + 12, y, { size: 11 }); rule(doc, M, y + 4, W - M); });
    // 3 at a glance
    page('Wedding at a glance', 3); head('Wedding at a glance', 'The essentials.');
    const glance = ['Couple', 'Wedding date', 'Ceremony venue & time', 'Reception venue & time', 'Guest count', 'Wedding budget', 'Dress designer / boutique', 'Dress size ordered', 'Delivery date of dress', 'Bridal seamstress', 'Seamstress phone / email', 'Shoes (brand, heel height)', 'Undergarments', 'Veil & accessories', 'Something old, new, borrowed, blue'];
    glance.forEach((l, i) => { const y = 58 + i * 13.5; T(doc, l, M, y, { size: 8.5, color: C.muted, upper: true, space: 0.4 }); field(M + 66, y - 6, W - 2 * M - 66, 7.5, { value: (i === 1 && date) ? date : (i === 0 && bride) ? bride : '' }); });
    // 4 timeline
    page('Alteration timeline', 4, C.white); head('Your alteration timeline', 'When to do what.');
    const tl = [['10–12 months', ['Say yes to the dress (allow 6–8 months for ordering)', 'Ask the boutique what alterations they offer and the cost']], ['6–8 months', ['Book your bridal seamstress', 'Buy your wedding shoes and undergarments']], ['3–4 months', ['Confirm your fitting dates', 'Decide on sleeves, straps or other design changes']], ['8–12 weeks', ['First fitting: hem, bodice, design changes', 'Bring shoes, undergarments and accessories']], ['3–5 weeks', ['Second fitting: check every change', 'Choose your bustle style']], ['1–2 weeks', ['Final fitting & bustle lesson with your helper', 'Arrange pressing / steaming and pick-up']], ['Wedding week', ['Pick up your dress and keep it hanging in its bag', 'Pack your emergency kit']], ['After the wedding', ['Book cleaning & preservation within a few weeks', 'Store away from light in acid-free tissue']]];
    let ty = 56; tl.forEach(([when, items]) => { T(doc, when, M, ty, { size: 9, style: 'medium', color: C.goldD, upper: true, space: 0.5 }); items.forEach((it, k) => check(M + 46, ty + k * 7.5, it, { max: 120 })); ty += items.length * 7.5 + 7; });
    // 5 fitting tracker
    page('Fitting tracker', 5); head('Fitting tracker', 'Three fittings, every detail.');
    for (let f = 0; f < 3; f++) {
      const y0 = 56 + f * 72; doc.setFillColor(C.white); doc.rect(M, y0, W - 2 * M, 66, 'F');
      T(doc, ['First fitting', 'Second fitting', 'Final fitting'][f], M + 5, y0 + 9, { size: 12, font: 'Lora', style: 'italic', color: C.goldD });
      T(doc, 'Date', M + 70, y0 + 9, { size: 7.5, color: C.muted, upper: true }); field(M + 82, y0 + 4, 34, 6.5);
      T(doc, 'Time', M + 122, y0 + 9, { size: 7.5, color: C.muted, upper: true }); field(M + 134, y0 + 4, 39, 6.5);
      T(doc, 'Changes made', M + 5, y0 + 20, { size: 7.5, color: C.muted, upper: true }); field(M + 5, y0 + 22, W - 2 * M - 10, 16, { multi: true, box: true });
      T(doc, 'Still to do', M + 5, y0 + 45, { size: 7.5, color: C.muted, upper: true }); field(M + 5, y0 + 47, 110, 13, { multi: true, box: true });
      T(doc, 'Cost / paid', M + 122, y0 + 45, { size: 7.5, color: C.muted, upper: true }); field(M + 122, y0 + 47, W - 2 * M - 127, 13, { multi: true, box: true });
    }
    // 6 bring & ask
    page('What to bring & ask', 6, C.white); head('What to bring & what to ask', 'Walk in prepared.');
    eyebrow(doc, 'Bring to every fitting', M, 58);
    ['Your wedding shoes (the exact pair)', 'Your wedding undergarments & shapewear', 'Veil, belt, jewellery and hair pieces', 'Photos of the look you want', 'This planner and a pen', 'A friend whose opinion you trust'].forEach((t, i) => check(M, 68 + i * 8, t, { max: 80 }));
    eyebrow(doc, 'Questions to ask your seamstress', 112, 58);
    let qy = 68; ['How many fittings will I need, and when?', 'What is the total cost, and when do I pay?', 'Which bustle suits my train and fabric?', 'Will lace or beading be removed and re-applied by hand?', 'Can you keep the fabric you cut off?', 'Do you press the dress before pick-up?', 'What is your rush fee, if I need one?', 'What happens if my weight changes?'].forEach(q => { qy = para(doc, '·  ' + q, 112, qy, W - M - 112, { size: 9 }) + 2.5; });
    eyebrow(doc, 'Your measurements at each fitting', M, 150);
    const mh = ['', 'Bust', 'Waist', 'Hips', 'Hem length', 'Notes']; const cw = (W - 2 * M) / 6;
    mh.forEach((h, i) => T(doc, h, M + i * cw + 1, 160, { size: 7.5, color: C.muted, upper: true }));
    ['Fitting 1', 'Fitting 2', 'Final'].forEach((r, k) => { const y = 168 + k * 11; T(doc, r, M + 1, y + 4, { size: 8.5 }); for (let i = 1; i < 6; i++) field(M + i * cw + 1, y - 1, cw - 3, 6.5); });
    eyebrow(doc, 'Notes', M, 212); field(M, 216, W - 2 * M, 44, { multi: true, box: true });
    // 7 costs & budget
    page('Alteration costs & budget', 7); head('Alteration costs & budget', 'What to expect to pay.');
    para(doc, 'Typical Ontario price ranges in Canadian dollars. Lace, beading, layers and rush timelines raise the cost, so always ask for a written quote at your first fitting.', M, 52, W - 2 * M, { size: 9, color: C.muted });
    const br = (typeof ALTERATIONS !== 'undefined' ? ALTERATIONS : []).filter(a => a.bridal);
    T(doc, 'Alteration', M, 68, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Typical cost', M + 88, 68, { size: 7.5, color: C.muted, upper: true }); T(doc, 'My quote', M + 128, 68, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Paid', M + 158, 68, { size: 7.5, color: C.muted, upper: true });
    br.concat([{ title: 'Pressing & steaming', cost: [50, 150] }, { title: 'Other', cost: null }]).forEach((a, i) => { const y = 78 + i * 12; T(doc, a.title, M, y, { size: 9.5 }); T(doc, a.cost ? `$${a.cost[0]}–$${a.cost[1]}` : '—', M + 88, y, { size: 9.5, color: C.goldD }); field(M + 128, y - 5.5, 25, 7); field(M + 158, y - 5.5, W - 2 * M - 158, 7); rule(doc, M, y + 3, W - M); });
    const ty7 = 78 + (br.length + 2) * 12 + 6; T(doc, 'Total alterations', M, ty7, { size: 11, style: 'regular' }); field(M + 128, ty7 - 6, 25, 7.5); field(M + 158, ty7 - 6, W - 2 * M - 158, 7.5);
    // 8 bustle guide
    page('Bustle guide', 8, C.white); head('Bustle guide', 'Lift your train, then dance.');
    const bus = [['American (over) bustle', 'The train is lifted up and hooked over the outside of the skirt in one or more points. Quick to do and great for heavy trains and lace.', 'over'], ['French (under) bustle', 'The train is tucked under and tied with numbered, colour-coded ribbons inside the skirt. Creates a soft, layered look, ideal for satin and long trains.', 'under'], ['Ballroom bustle', 'The train is lifted all the way round so the hem looks floor-length again. Best for very long trains and lots of dancing.', 'ball']];
    bus.forEach(([t, d, kind], i) => {
      const y = 58 + i * 58, x = M; doc.setFillColor(C.ivory); doc.rect(x, y, W - 2 * M, 52, 'F');
      // simple gown sketch
      const gx = x + 24, gy = y + 6; doc.setDrawColor(C.ink); doc.setLineWidth(0.35);
      doc.line(gx - 4, gy, gx + 4, gy); doc.line(gx - 4, gy, gx - 6, gy + 14); doc.line(gx + 4, gy, gx + 6, gy + 14); doc.line(gx - 6, gy + 14, gx - 16, gy + 42); doc.line(gx + 6, gy + 14, gx + 16, gy + 42); doc.line(gx - 16, gy + 42, gx + 16, gy + 42);
      doc.setDrawColor(C.gold); doc.setLineWidth(0.5);
      if (kind === 'over') { doc.lines([[6, -8], [10, 4]], gx + 12, gy + 38); doc.circle(gx + 8, gy + 22, 1.2, 'S'); }
      if (kind === 'under') { doc.setLineDashPattern([1, 1], 0); doc.lines([[8, -6], [8, 6]], gx + 6, gy + 34); doc.setLineDashPattern([], 0); doc.circle(gx + 12, gy + 30, 1, 'S'); doc.circle(gx + 4, gy + 30, 1, 'S'); }
      if (kind === 'ball') { [-10, 0, 10].forEach(dx => doc.circle(gx + dx, gy + 26, 1, 'S')); }
      T(doc, t, x + 48, y + 12, { size: 13, font: 'Lora', style: 'italic', color: C.goldD });
      para(doc, d, x + 48, y + 20, W - 2 * M - 54, { size: 9 });
      T(doc, 'Points / notes:', x + 48, y + 44, { size: 7.5, color: C.muted, upper: true }); field(x + 76, y + 39, W - 2 * M - 82, 6.5);
    });
    T(doc, 'Tip: take a video at your final fitting while the seamstress shows your helper how to bustle you.', M, 236, { size: 9, font: 'Lora', style: 'italic', color: C.goldD, max: W - 2 * M });
    // 9 12-month checklist
    page('12-month checklist', 9); head('12-month wedding checklist', 'One step at a time.');
    const months = [['12+ months', ['Set the budget', 'Choose the date', 'Book the venue', 'Draft the guest list']], ['9–11 months', ['Book photographer & videographer', 'Book caterer & officiant', 'Shop for the dress']], ['6–8 months', ['Send save-the-dates', 'Book florist, music & cake', 'Book your seamstress']], ['4–5 months', ['Order invitations', 'Book hair & makeup trial', 'Plan the honeymoon']], ['2–3 months', ['Mail invitations', 'First dress fitting', 'Buy the rings']], ['1 month', ['Final headcount', 'Seating plan', 'Second fitting']], ['1–2 weeks', ['Final fitting & bustle lesson', 'Confirm all vendors', 'Pack the emergency kit']], ['The day before', ['Pick up the dress', 'Rest, hydrate and sleep well']]];
    months.forEach(([m, items], i) => { const col = i % 2, row = Math.floor(i / 2), x = M + col * ((W - 2 * M) / 2 + 4), y = 58 + row * 50; T(doc, m, x, y, { size: 9, style: 'medium', color: C.goldD, upper: true, space: 0.5 }); items.forEach((it, k) => check(x, y + 9 + k * 8, it, { max: 80 })); });
    // 10 vendor contacts
    page('Vendor contacts', 10, C.white); head('Vendor contacts', 'Everyone, in one place.');
    const vend = ['Venue', 'Bridal boutique', 'Seamstress', 'Photographer', 'Videographer', 'Caterer', 'Florist', 'Hair & makeup', 'Music / DJ', 'Cake', 'Officiant', 'Transport', 'Planner'];
    T(doc, 'Vendor', M, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Name', M + 40, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Phone / email', M + 92, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Deposit paid', M + 150, 58, { size: 7.5, color: C.muted, upper: true });
    vend.forEach((v, i) => { const y = 70 + i * 13.5; T(doc, v, M, y, { size: 9.5 }); field(M + 40, y - 6, 48, 7.5); field(M + 92, y - 6, 54, 7.5); field(M + 150, y - 6, W - 2 * M - 150, 7.5); });
    // 11 wedding budget
    page('Wedding budget', 11); head('Wedding budget', 'Plan it, then track it.');
    const cats = ['Venue & rentals', 'Food & drink', 'Dress & alterations', 'Suit / partner attire', 'Photography & video', 'Flowers & decor', 'Music & entertainment', 'Hair & makeup', 'Stationery', 'Rings', 'Cake', 'Transport', 'Gifts & favours', 'Honeymoon', 'Other'];
    T(doc, 'Category', M, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Estimated', M + 84, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Actual', M + 120, 58, { size: 7.5, color: C.muted, upper: true }); T(doc, 'Paid', M + 152, 58, { size: 7.5, color: C.muted, upper: true });
    cats.forEach((c, i) => { const y = 68 + i * 11.5; T(doc, c, M, y, { size: 9.5 }); field(M + 84, y - 5.5, 30, 7); field(M + 120, y - 5.5, 28, 7); field(M + 152, y - 5.5, W - 2 * M - 152, 7); });
    const yT = 68 + cats.length * 11.5 + 4; T(doc, 'Total', M, yT, { size: 11, style: 'regular' }); field(M + 84, yT - 6, 30, 7.5); field(M + 120, yT - 6, 28, 7.5); field(M + 152, yT - 6, W - 2 * M - 152, 7.5);
    // 12 day-of timeline
    page('Day-of timeline', 12, C.white); head('Day-of timeline', 'Your wedding day, hour by hour.');
    ['Wake up & breakfast', 'Hair & makeup begins', 'Photographer arrives', 'Get into the dress', 'First look / portraits', 'Travel to ceremony', 'Ceremony', 'Family photos', 'Cocktail hour', 'Bustle the dress', 'Grand entrance & dinner', 'Speeches', 'First dance', 'Cake cutting', 'Last dance & send-off'].forEach((e, i) => { const y = 60 + i * 12.5; field(M, y - 6, 26, 7.5); T(doc, e, M + 32, y, { size: 10 }); field(M + 100, y - 6, W - M - 100, 7.5); });
    // 13 emergency kit + care
    page('Emergency kit & gown care', 13); head('Emergency kit & gown care', 'Ready for anything.');
    const kit = ['Safety pins & a small sewing kit', 'Fashion tape & clear nail polish', 'Stain pen & white chalk', 'Bobby pins & hair spray', 'Blotting papers & lipstick', 'Pain relievers & blister plasters', 'Mints & a water bottle', 'Phone charger', 'Tissues & a small mirror', 'Flat shoes for dancing', 'Snacks', 'Umbrella'];
    kit.forEach((k, i) => check(M + (i % 2) * 90, 62 + Math.floor(i / 2) * 9, k, { max: 80 }));
    eyebrow(doc, 'After the wedding: caring for your gown', M, 128);
    let cy = 138; ['Have it professionally cleaned within a few weeks. Sugar stains (champagne, cake) turn brown over time even when you can\'t see them.', 'Choose a gown specialist who uses acid-free tissue and a breathable box or garment bag.', 'Store it flat or folded in tissue, away from light, heat and damp. Never in plastic.', 'Check on it once a year and refold along different lines to avoid permanent creases.'].forEach(t => { cy = para(doc, '·  ' + t, M, cy, W - 2 * M, { size: 10 }) + 3; });
    para(doc, 'Need a recommendation? The Hatille alteration finder lists trusted gown cleaning and preservation specialists near you at hatille.com/alterations.', M, cy + 8, W - 2 * M, { size: 9.5, font: 'Lora', style: 'italic', color: C.goldD });
    // 14 notes
    page('Notes', 14, C.white); head('Notes', 'Ideas, inspiration and reminders.');
    field(M, 52, W - 2 * M, 190, { multi: true, box: true });
    T(doc, 'With love from Hatille. For fitting advice or a styling session, book a consultation at hatille.com/book.', W / 2, H - 22, { size: 8, color: C.muted, align: 'center' });
    return doc;
  }

  window.HatilleProducts = { paletteGuide, swatchSet, bridalPlanner, libs };
})();
