/* Hatille colour analysis: skin-tone reading, digital draping, season palettes, virtual try-on */

const SEASONS = {
  'Light Spring': { family: 'Spring', desc: 'Warm, light and delicate. You glow in clear pastels with a golden base.', colors: ['#f6d7a7', '#f4b183', '#f2a1a8', '#ffd966', '#a8d5ba', '#8fd3e8', '#c9b3e6', '#f7efe2', '#d8a47f', '#7fb3a3'], metals: 'Light gold, rose gold' },
  'True Spring': { family: 'Spring', desc: 'Warm and clear. Fresh, sunny colours bring out your natural warmth.', colors: ['#f26b3a', '#ffb000', '#f7d046', '#5cb85c', '#2fb5a8', '#3fa7d6', '#f4877a', '#e8c39e', '#a0522d', '#fff4dc'], metals: 'Yellow gold, brass' },
  'Bright Spring': { family: 'Spring', desc: 'Warm-leaning and vivid. High-energy colours match your contrast.', colors: ['#ff3b57', '#ff7a00', '#ffd400', '#00b26b', '#00a3e0', '#7a3dff', '#ff5fa2', '#1c1c1c', '#ffffff', '#00897b'], metals: 'Polished gold' },
  'Light Summer': { family: 'Summer', desc: 'Cool, light and soft. Airy pastels with a blue base flatter you.', colors: ['#c9d8ef', '#a9c6e8', '#e8bfd1', '#d7c4e8', '#b7e0d8', '#f2d1d9', '#9fb8c8', '#f4f1f6', '#8aa3b8', '#c6a8c9'], metals: 'Silver, platinum' },
  'True Summer': { family: 'Summer', desc: 'Cool and gentle. Dusty blues, roses and soft greys are your best friends.', colors: ['#6f8fb5', '#4a6b8a', '#c06c84', '#9b6a9e', '#7aa9a1', '#b8c4d6', '#d4a5b5', '#5b6b7b', '#e6e1ec', '#2f4a6b'], metals: 'Silver, white gold' },
  'Soft Summer': { family: 'Summer', desc: 'Cool-neutral and muted. Smoky, blended colours look elegant on you.', colors: ['#8c9aa8', '#a3899a', '#7f9488', '#b39ca1', '#6b7a8f', '#c9bcb4', '#8e7f8f', '#5f6b6d', '#d9cfc7', '#9fa8a3'], metals: 'Brushed silver, pewter' },
  'Soft Autumn': { family: 'Autumn', desc: 'Warm-neutral and muted. Gentle earth tones blend beautifully with your skin.', colors: ['#c7a17a', '#a8916d', '#b07a6a', '#8f9a6f', '#6f8c84', '#d8b998', '#9c6b5a', '#c4a484', '#7d6e5d', '#e6d3bd'], metals: 'Brushed gold, bronze' },
  'True Autumn': { family: 'Autumn', desc: 'Warm and rich. Spice, olive and golden earth colours light you up.', colors: ['#c0642b', '#d99a2b', '#6b7b2f', '#8a3b2a', '#a0522d', '#2f5d50', '#e0b04a', '#7a4a2a', '#b8860b', '#f0dcc0'], metals: 'Yellow gold, copper, bronze' },
  'Deep Autumn': { family: 'Autumn', desc: 'Warm and deep. Rich, saturated earth and jewel tones match your depth beautifully.', colors: ['#7b1e1e', '#b5532b', '#c9952b', '#3e5f2a', '#1f4d4a', '#5a2d4a', '#3b2416', '#a66b2a', '#0f3b3a', '#e2b866'], metals: 'Antique gold, bronze, copper' },
  'Deep Winter': { family: 'Winter', desc: 'Cool-leaning and deep. Dramatic jewel tones and true black are stunning on you.', colors: ['#0c0b0a', '#7a0f2e', '#0b3d91', '#0f5c4a', '#4b1a6b', '#b0103a', '#1d1d3a', '#ffffff', '#5b0f0f', '#00796b'], metals: 'Silver, platinum, white gold' },
  'True Winter': { family: 'Winter', desc: 'Cool and clear. Crisp, icy and bold colours match your natural contrast.', colors: ['#000000', '#ffffff', '#c8102e', '#1d3f8f', '#00843d', '#6a1b9a', '#e5007e', '#9fb7d9', '#3c3c3c', '#e6f0fa'], metals: 'Silver, platinum' },
  'Bright Winter': { family: 'Winter', desc: 'Cool-leaning and vivid. Electric, high-contrast colours make you shine.', colors: ['#ff0066', '#0057ff', '#00c389', '#7b2fff', '#ffe600', '#000000', '#ffffff', '#ff2a2a', '#00b5e2', '#c4006e'], metals: 'Polished silver' },
};

/* Professional draping test: each pair compares two qualities */
const DRAPE_TESTS = [
  { q: 'Gold or silver?', a: { name: 'Gold', hex: '#c9a24a', sheen: true, vote: { warm: 1 } }, b: { name: 'Silver', hex: '#b8bec8', sheen: true, vote: { cool: 1 } } },
  { q: 'Tomato red or blue red?', a: { name: 'Tomato red', hex: '#d9472b', vote: { warm: 1 } }, b: { name: 'Blue red', hex: '#b0103a', vote: { cool: 1 } } },
  { q: 'Camel or grey?', a: { name: 'Camel', hex: '#b88a5a', vote: { warm: 1, soft: 0.5 } }, b: { name: 'Cool grey', hex: '#8a919c', vote: { cool: 1, soft: 0.5 } } },
  { q: 'Ivory or pure white?', a: { name: 'Ivory', hex: '#f3e9d2', vote: { warm: 1, soft: 0.5 } }, b: { name: 'Pure white', hex: '#ffffff', vote: { cool: 1, bright: 1 } } },
  { q: 'Pastel or deep?', a: { name: 'Soft pastel', hex: '#c9d8ef', vote: { light: 1 } }, b: { name: 'Deep jewel', hex: '#1f3f6b', vote: { deep: 1 } } },
  { q: 'Vivid or muted?', a: { name: 'Vivid green', hex: '#00a86b', vote: { bright: 1 } }, b: { name: 'Muted sage', hex: '#8a9a80', vote: { soft: 1 } } },
];

/* colour maths */
function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function rgb2lab([r, g, b]) {
  [r, g, b] = [r, g, b].map(v => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; });
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

function analyseSkin(rgb) {
  const [L, a, b] = rgb2lab(rgb);
  const hue = Math.atan2(b, a) * 180 / Math.PI;
  const chroma = Math.hypot(a, b);
  const undertone = hue >= 57 ? 'Warm' : hue <= 49 ? 'Cool' : 'Neutral';
  const depth = L > 66 ? 'Light' : L > 47 ? 'Medium' : 'Deep';
  const clarity = chroma > 26 ? 'Clear' : chroma < 16 ? 'Soft' : 'Balanced';
  return { L, a, b, hue, chroma, undertone, depth, clarity };
}

function seasonFrom(skin, votes = {}) {
  let warm = (skin.undertone === 'Warm' ? 2 : skin.undertone === 'Cool' ? -2 : 0) + (votes.warm || 0) - (votes.cool || 0);
  let deep = (skin.depth === 'Deep' ? 2 : skin.depth === 'Light' ? -2 : 0) + (votes.deep || 0) - (votes.light || 0);
  let bright = (skin.clarity === 'Clear' ? 1 : skin.clarity === 'Soft' ? -1 : 0) + (votes.bright || 0) - (votes.soft || 0);
  const W = warm > 0.5 ? 'warm' : warm < -0.5 ? 'cool' : 'neutral';
  if (deep >= 2) return W === 'cool' ? (bright > 1 ? 'Bright Winter' : 'Deep Winter') : W === 'warm' ? 'Deep Autumn' : (bright > 0 ? 'Deep Winter' : 'Deep Autumn');
  if (deep <= -2) return W === 'cool' ? 'Light Summer' : W === 'warm' ? 'Light Spring' : (bright > 0 ? 'Light Spring' : 'Light Summer');
  if (bright >= 2) return W === 'cool' ? 'Bright Winter' : 'Bright Spring';
  if (bright <= -1) return W === 'warm' ? 'Soft Autumn' : W === 'cool' ? 'Soft Summer' : (deep > 0 ? 'Soft Autumn' : 'Soft Summer');
  if (W === 'warm') return deep > 0 ? 'True Autumn' : 'True Spring';
  if (W === 'cool') return deep > 0 ? 'True Winter' : 'True Summer';
  return deep > 0 ? 'Soft Autumn' : 'Soft Summer';
}

/* ── Draping canvas ── */
class Drape {
  constructor(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.img = null; this.zoom = 1; this.ox = 0; this.oy = 0; this.color = '#8a8580'; this.sheen = false; this.showDrape = true;
    let drag = null;
    const pos = e => { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * canvas.width / r.width, (t.clientY - r.top) * canvas.height / r.height]; };
    const down = e => { if (this.onPick && this.picking) { const [px, py] = pos(e); this.onPick(this.sample(px, py), px, py); return; } drag = pos(e); };
    const move = e => { if (!drag || !this.img) return; const p = pos(e); this.ox += p[0] - drag[0]; this.oy += p[1] - drag[1]; drag = p; this.draw(); if (this.onMove) this.onMove(); e.preventDefault(); };
    const up = () => drag = null;
    canvas.addEventListener('mousedown', down); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: true }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', up);
  }
  setImage(img) {
    this.img = img;
    const W = this.c.width, H = this.c.height;
    this.base = Math.max(W / img.width, H / img.height);
    this.zoom = 1; this.ox = 0; this.oy = 0; this.draw();
  }
  photoRect() {
    const W = this.c.width, H = this.c.height, s = this.base * this.zoom;
    const w = this.img.width * s, h = this.img.height * s;
    return [(W - w) / 2 + this.ox, (H - h) / 2 + this.oy, w, h];
  }
  sample(px, py) {
    // average a small patch from the photo only (no drape), ignoring very dark/bright pixels
    const off = document.createElement('canvas'); off.width = this.c.width; off.height = this.c.height;
    const o = off.getContext('2d'); const [x, y, w, h] = this.photoRect(); o.drawImage(this.img, x, y, w, h);
    const r = 7, d = o.getImageData(Math.max(0, px - r), Math.max(0, py - r), r * 2, r * 2).data;
    let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { const l = d[i] + d[i + 1] + d[i + 2]; if (l < 40 || l > 720) continue; R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    return n ? [R / n, G / n, B / n] : null;
  }
  draw() {
    const { x, c } = this, W = c.width, H = c.height;
    x.fillStyle = '#d9d4cc'; x.fillRect(0, 0, W, H);
    if (this.img) { const [px, py, w, h] = this.photoRect(); x.drawImage(this.img, px, py, w, h); }
    if (!this.showDrape) return;
    // fabric drape around the shoulders: a cape from below the chin to the bottom edge
    const top = H * 0.64;
    x.save();
    x.beginPath();
    x.moveTo(0, top + H * 0.10);
    x.bezierCurveTo(W * 0.22, top + H * 0.02, W * 0.36, top - H * 0.02, W * 0.5, top + H * 0.03);
    x.bezierCurveTo(W * 0.64, top - H * 0.02, W * 0.78, top + H * 0.02, W, top + H * 0.10);
    x.lineTo(W, H); x.lineTo(0, H); x.closePath();
    x.fillStyle = this.color; x.fill();
    x.clip();
    // folds and light for a real fabric feel
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(.18, 'rgba(255,255,255,.08)'); g.addColorStop(.35, 'rgba(0,0,0,.12)');
    g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(.66, 'rgba(0,0,0,.10)'); g.addColorStop(.84, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
    x.fillStyle = g; x.fillRect(0, top - 40, W, H);
    if (this.sheen) { const s = x.createLinearGradient(0, top, W, H); s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(.45, 'rgba(255,255,255,.35)'); s.addColorStop(.55, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(0, top - 40, W, H); }
    x.restore();
    // drape neckline edge
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, top + H * 0.10); x.bezierCurveTo(W * 0.22, top + H * 0.02, W * 0.36, top - H * 0.02, W * 0.5, top + H * 0.03); x.bezierCurveTo(W * 0.64, top - H * 0.02, W * 0.78, top + H * 0.02, W, top + H * 0.10); x.stroke();
  }
}

/* ── Body shape & try-on ── */
function bodyShape({ shoulders, bust, waist, hips }) {
  const top = Math.max(bust, shoulders * 0.95);
  if (waist >= bust * 0.9 && waist >= hips * 0.9) return 'Round (Apple)';
  if (Math.abs(top - hips) / hips <= 0.05 && waist <= Math.min(top, hips) * 0.77) return 'Hourglass';
  if (hips > top * 1.05) return 'Pear (Triangle)';
  if (top > hips * 1.05) return 'Inverted Triangle';
  return 'Rectangle';
}
const SHAPE_ADVICE = {
  'Hourglass': { tip: 'Follow your waist. Wrap shapes, belted pieces and pencil skirts mirror your balanced curves.', garments: ['wrap', 'pencil', 'sheath', 'blazer'] },
  'Pear (Triangle)': { tip: 'Draw the eye up and let the skirt skim. Structured shoulders, A-lines and wide-leg trousers balance your hips.', garments: ['aline', 'blazer', 'wideleg', 'wrap'] },
  'Inverted Triangle': { tip: 'Add volume below and soften the shoulders. V-necks, A-line skirts and wide-leg trousers create balance.', garments: ['aline', 'wideleg', 'wrap', 'empire'] },
  'Rectangle': { tip: 'Create curves with shape. Belted waists, peplums and structured blazers define your silhouette.', garments: ['wrap', 'blazer', 'aline', 'pencil'] },
  'Round (Apple)': { tip: 'Elongate and skim. Empire waists, V-necks and open long layers create a beautiful vertical line.', garments: ['empire', 'wrap', 'wideleg', 'blazer'] },
};
/* Garment silhouettes on a 200 × 320 canvas, neck at top-centre */
const GARMENTS = {
  wrap: { name: 'Wrap dress', d: 'M70 0 L100 70 L130 0 L160 10 L178 70 L160 80 L150 130 Q160 200 185 318 L15 318 Q40 200 50 130 L40 80 L22 70 L40 10 Z M58 128 L142 128 L142 140 L58 140 Z' },
  aline: { name: 'A-line dress', d: 'M72 0 Q100 26 128 0 L158 12 L168 64 L150 74 L148 128 L196 318 L4 318 L52 128 L50 74 L32 64 L42 12 Z' },
  sheath: { name: 'Sheath dress', d: 'M74 0 Q100 22 126 0 L152 10 L150 70 L146 130 Q158 200 150 318 L50 318 Q42 200 54 130 L50 70 L48 10 Z' },
  pencil: { name: 'Blouse & pencil skirt', d: 'M70 0 L100 46 L130 0 L162 12 L182 110 L164 116 L150 70 L150 140 L52 140 L50 70 L36 116 L18 110 L38 12 Z M54 140 L146 140 Q154 220 146 300 L54 300 Q46 220 54 140 Z' },
  blazer: { name: 'Tailored blazer', d: 'M62 0 L100 90 L138 0 L176 16 L194 190 L170 194 L160 90 L158 200 L106 210 L100 120 L94 210 L42 200 L40 90 L30 194 L6 190 L24 16 Z' },
  wideleg: { name: 'Wide-leg trousers', d: 'M50 120 L150 120 L152 150 L190 318 L112 318 L100 190 L88 318 L10 318 L48 150 Z M60 0 Q100 20 140 0 L162 12 L158 120 L42 120 L38 12 Z' },
  empire: { name: 'Empire dress', d: 'M74 0 Q100 30 126 0 L154 12 L156 70 L50 70 L46 12 Z M48 70 L152 70 L156 82 Q186 200 192 318 L8 318 Q14 200 44 82 Z' },
};
