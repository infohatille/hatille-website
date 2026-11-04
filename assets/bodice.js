/* Hatille pattern block generator: tops, dresses, skirts, pants and jackets (women and men), in cm.
   Simplified close-fitting blocks (slopers) in the tradition of standard pattern-drafting systems.
   They are starting blocks: a tailor or dressmaker should fit, true and adjust them.
   Seam allowances are not included. */

const BLOCK_TYPES = {
  women: [['top', 'Top'], ['dress', 'Dress'], ['skirt', 'Skirt'], ['pants', 'Pants'], ['jacket', 'Jacket']],
  men: [['top', 'Shirt / top'], ['pants', 'Pants'], ['jacket', 'Jacket']],
};

const BLOCK_DEFAULTS = {
  women: { bust: 88, waist: 70, nape: 41, back: 34.4, chest: 32.4, shoulder: 12.3, neck: 37, apex: 18,
    hip: 94, wh: 20.6, dlen: 60, jlen: 66, sklen: 60, arm: 28, slen: 58, wrist: 16, rise: 28, oleg: 102, hem: 40 },
  men: { bust: 100, waist: 86, nape: 44, back: 38, chest: 36, shoulder: 15.5, neck: 40, apex: 0,
    hip: 100, wh: 21, dlen: 60, jlen: 76, sklen: 60, arm: 32, slen: 64, wrist: 18, rise: 27, oleg: 106, hem: 44 },
};

const BLOCK_LABELS = {
  bust: { women: 'Full bust', men: 'Chest' }, waist: 'Waist', nape: 'Nape to waist (back length)',
  back: 'Back width', chest: { women: 'Chest width', men: 'Chest width (front)' }, shoulder: 'Shoulder length',
  neck: 'Neck size', apex: 'Bust point to bust point', hip: 'Hip (fullest part)', wh: 'Waist to hip',
  dlen: 'Dress length (waist to hem)', jlen: 'Jacket length (nape to hem)', sklen: 'Skirt length (waist to hem)',
  arm: 'Upper arm', slen: 'Sleeve length (shoulder to wrist)', wrist: 'Wrist',
  rise: 'Body rise (sitting: waist to chair)', oleg: 'Outside leg (waist to ankle)', hem: 'Trouser hem (around the opening)',
};

function blockFields(kind, type) {
  const bod = kind === 'women' ? ['bust', 'waist', 'nape', 'back', 'chest', 'shoulder', 'neck', 'apex'] : ['bust', 'waist', 'nape', 'back', 'chest', 'shoulder', 'neck'];
  const sl = ['arm', 'slen', 'wrist'];
  const keys = {
    top: [...bod, ...sl],
    dress: [...bod, 'hip', 'wh', 'dlen', ...sl],
    jacket: [...bod, 'hip', 'wh', 'jlen', ...sl],
    skirt: ['waist', 'hip', 'wh', 'sklen'],
    pants: ['waist', 'hip', 'rise', 'oleg', 'hem'],
  }[type];
  return keys.map(k => [k, typeof BLOCK_LABELS[k] === 'string' ? BLOCK_LABELS[k] : BLOCK_LABELS[k][kind]]);
}

/* returns an error message, or '' if the measurements can be drafted */
function blockCheck(m, kind, type) {
  if ((type === 'top' || type === 'dress' || type === 'jacket') && m.shoulder <= 5.2) return 'Shoulder length looks too small.';
  if (type === 'jacket' && m.jlen - m.nape <= m.wh + 2) return 'Jacket length must reach below the hip (nape to hem longer than nape to waist plus waist to hip).';
  if (type === 'dress' && m.dlen <= m.wh + 2) return 'Dress length must be longer than waist to hip.';
  if (type === 'skirt' && m.sklen <= m.wh + 2) return 'Skirt length must be longer than waist to hip.';
  if (type === 'pants' && m.oleg <= m.rise + 30) return 'Outside leg must be much longer than body rise.';
  if (m.waist > m.hip + 30 && (type === 'skirt' || type === 'pants')) return 'Please check the waist and hip measurements.';
  return '';
}

/* ---------- helpers ---------- */
const P = (x, y) => ({ x, y });
const fx = (n) => (+n).toFixed(2);
const pt = (p) => `${fx(p.x)} ${fx(p.y)}`;
function cubicLen(p0, p1, p2, p3) {
  let L = 0, prev = p0;
  for (let i = 1; i <= 48; i++) {
    const t = i / 48, u = 1 - t;
    const q = P(u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y);
    L += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q;
  }
  return L;
}
function newDraft() { return { pieces: [], darts: [], guides: [], labels: [], grains: [], dots: [], dashed: [], groups: [] }; }

/* ---------- TOP / DRESS / JACKET (bodice family) ---------- */
function draftBodice(m, kind, mode, D) {
  const women = kind === 'women', jacket = mode === 'jacket', long = mode !== 'top';
  const ease = jacket ? (women ? 7 : 8) : (women ? 5 : 8);   // half-body ease: fitted top 10 cm, shirt 16 cm, jacket 14 / 16 cm in total
  const TW = m.bust / 2 + ease;
  const SD = (women ? 0.1 * m.bust + 12.2 : 0.1 * m.bust + 13.8) + (jacket ? (women ? 1.5 : 2) : 0);
  const NW = m.nape;
  const XS = TW / 2 - (women ? 0.5 : 1);
  const need = m.waist / 2 + (jacket ? (women ? 5 : 8) : (women ? 3 : 6));
  const E = Math.max(0, TW - need);
  const nk = jacket ? 0.5 : 0;
  const L = mode === 'dress' ? m.dlen : mode === 'jacket' ? m.jlen - m.nape : 0;   // below the waist
  const ext = jacket ? (women ? 2 : 2.5) : 0;
  const hipE = jacket ? (women ? 2 : 2.5) : 1;
  const HB = m.hip / 4 + hipE, HF = TW - (m.hip / 4 + hipE);

  // back
  const bnw = m.neck / 5 - (women ? 0.2 : 0.7) + nk;
  const N0 = P(0, 0), HNPb = P(bnw, -2);
  const bDrop = women ? 4.5 : 4, bLen = m.shoulder + (women ? 1 : 0.5);
  const SPb = P(HNPb.x + Math.sqrt(bLen ** 2 - bDrop ** 2), HNPb.y + bDrop);
  const BWP = P(m.back / 2 + 0.5 + (jacket ? 0.5 : 0), SD / 2);
  const UA = P(XS, SD);
  const cb = women ? E * 0.1 : E * 0.2;
  const sideB = women ? E * 0.15 : E * 0.25;
  const bDartW = E * 0.3;
  const bDx = BWP.x / 2 + 1, bDapex = P(bDx, SD + 2);

  // front
  const fnw = m.neck / 5 - 0.7 + nk, fnd = m.neck / 5 + (women ? 1 : 0.5) + (jacket ? 1 : 0);
  const HNPf = P(TW - fnw, -1.5), CFN = P(TW, -1.5 + fnd);
  const fDrop = 5;
  const dirx = -Math.sqrt(m.shoulder ** 2 - fDrop ** 2) / m.shoulder, diry = fDrop / m.shoulder;
  const sideF = women ? E * 0.15 : E * 0.25;
  const fDartW = women ? E * 0.3 : 0;
  const CWP = P(TW - m.chest / 2 - (jacket ? 0.5 : 0), SD / 2 + 2);
  const SPf = P(HNPf.x + dirx * m.shoulder, HNPf.y + diry * m.shoulder);
  let BP = null, dW = 0;
  if (women) { BP = P(TW - m.apex / 2, SD + 2.5); dW = Math.min(6, Math.max(2.5, (m.bust - 80) / 10 + 3)); }

  // back outline
  const back = [];
  back.push(`M${pt(N0)} Q${fx(bnw * 0.75)} 0 ${pt(HNPb)} L${pt(SPb)}`);
  back.push(`C${fx(SPb.x - 0.3)} ${fx(SPb.y + 4)} ${fx(BWP.x)} ${fx(BWP.y - 3)} ${pt(BWP)}`);
  back.push(`C${fx(BWP.x)} ${fx(SD - 2.5)} ${fx(BWP.x + 1.5)} ${fx(SD)} ${pt(UA)}`);
  const bSideW = P(XS - sideB, NW);
  back.push(`L${pt(bSideW)}`);
  if (!long) {
    back.push(`L${fx(bDx + bDartW / 2)} ${fx(NW)} L${pt(bDapex)} L${fx(bDx - bDartW / 2)} ${fx(NW)}`);
    back.push(`L${fx(cb)} ${fx(NW)} L0 ${fx(SD)} Z`);
  } else {
    back.push(`C${fx(bSideW.x)} ${fx(NW + m.wh * 0.45)} ${fx(HB)} ${fx(NW + m.wh * 0.55)} ${fx(HB)} ${fx(NW + m.wh)}`);
    back.push(`L${fx(HB)} ${fx(NW + L)} L0 ${fx(NW + L)} L0 ${fx(NW + m.wh)} C0 ${fx(NW + m.wh * 0.5)} ${fx(cb)} ${fx(NW + 3)} ${fx(cb)} ${fx(NW)} L0 ${fx(SD)} Z`);
    const w = jacket ? bDartW * 0.7 : bDartW;
    D.darts.push(`M${pt(bDapex)} L${fx(bDx + w / 2)} ${fx(NW)} L${fx(bDx)} ${fx(NW + (jacket ? 15 : 14))} L${fx(bDx - w / 2)} ${fx(NW)} Z`);
  }

  // front outline
  const fr = [];
  fr.push(`M${pt(CFN)} Q${fx(HNPf.x + 0.6)} ${fx(CFN.y)} ${pt(HNPf)} L${pt(SPf)}`);
  const UAf = women ? P(XS, SD - dW) : UA;
  fr.push(`C${fx(SPf.x + 0.3)} ${fx(SPf.y + 4)} ${fx(CWP.x)} ${fx(CWP.y - 3)} ${pt(CWP)}`);
  fr.push(`C${fx(CWP.x)} ${fx(UAf.y - 2)} ${fx(CWP.x - 2)} ${fx(UAf.y)} ${pt(UAf)}`);
  const fSideW = P(XS + sideF, NW);
  if (women) {
    const onSide = (y) => P(UAf.x + (fSideW.x - UAf.x) * (y - UAf.y) / (fSideW.y - UAf.y), y);
    const a = onSide(SD + 4 - dW), c = onSide(SD + 4);
    fr.push(`L${pt(a)} L${fx(BP.x - 2.5)} ${fx(BP.y)} L${pt(c)}`);
  }
  fr.push(`L${pt(fSideW)}`);
  if (!long) {
    if (women) fr.push(`L${fx(BP.x - fDartW / 2)} ${fx(NW)} L${fx(BP.x)} ${fx(BP.y + 2.5)} L${fx(BP.x + fDartW / 2)} ${fx(NW)}`);
    fr.push(`L${fx(TW)} ${fx(NW)} Z`);
  } else {
    fr.push(`C${fx(fSideW.x)} ${fx(NW + m.wh * 0.45)} ${fx(HF)} ${fx(NW + m.wh * 0.55)} ${fx(HF)} ${fx(NW + m.wh)}`);
    fr.push(`L${fx(HF)} ${fx(NW + L)} L${fx(TW + ext)} ${fx(NW + L)} L${fx(TW + ext)} ${fx(CFN.y)} Z`);
    if (women) {
      const w = jacket ? fDartW * 0.7 : fDartW;
      D.darts.push(`M${fx(BP.x)} ${fx(BP.y + 2.5)} L${fx(BP.x + w / 2)} ${fx(NW)} L${fx(BP.x)} ${fx(NW + 12)} L${fx(BP.x - w / 2)} ${fx(NW)} Z`);
    }
    if (jacket) D.dashed.push(`M${fx(TW)} ${fx(CFN.y)} V${fx(NW + L)}`);
  }

  const bottom = NW + L;
  D.pieces.push({ d: back.join(' '), fill: 'rgba(176,141,87,.07)' }, { d: fr.join(' '), fill: 'rgba(12,11,10,.03)' });
  const right = TW + ext;
  D.guides.push({ y: SD, x1: 0, x2: right, label: 'armhole line' }, { y: NW, x1: 0, x2: right, label: 'waist line' });
  if (long) D.guides.push({ y: NW + m.wh, x1: 0, x2: right, label: 'hip line' });
  if (women) D.dots.push({ x: BP.x, y: BP.y, label: 'BP' });
  const gy2 = long ? bottom - 6 : NW - 4;
  D.grains.push({ x: XS / 2 - 5, y1: SD - 6, y2: gy2 }, { x: XS + (TW - XS) / 2 + 6, y1: SD - 6, y2: gy2 });
  const cutB = mode === 'top' ? 'Cut 1 on fold' : 'Cut 2', cutF = mode === 'jacket' ? 'Cut 2' : 'Cut 1 on fold';
  D.labels.push({ x: XS / 2 + 1, y: SD + 6, s: 'BACK', size: 1.6 }, { x: XS + (TW - XS) / 2 - 1, y: SD + 6, s: 'FRONT', size: 1.6 },
    { x: XS / 2 + 1, y: SD + 8, s: cutB, size: 0.8, w: 400 }, { x: XS + (TW - XS) / 2 - 1, y: SD + 8, s: cutF, size: 0.8, w: 400 },
    { x: 0.5, y: SD - 1, s: 'CB', size: 0.8, anchor: 'start' }, { x: TW - 0.5, y: SD - 1, s: 'CF', size: 0.8, anchor: 'end' });
  if (jacket) D.labels.push({ x: TW + ext / 2, y: NW + L - 2, s: 'ext.', size: 0.6, w: 400 });
  D.groups.push({ x1: -1, y1: -3, x2: right + 1, y2: bottom + 1 });

  // armhole length for the sleeve
  const AHb = cubicLen(SPb, P(SPb.x - 0.3, SPb.y + 4), P(BWP.x, BWP.y - 3), BWP) + cubicLen(BWP, P(BWP.x, SD - 2.5), P(BWP.x + 1.5, SD), UA);
  const AHf = cubicLen(SPf, P(SPf.x + 0.3, SPf.y + 4), P(CWP.x, CWP.y - 3), CWP) + cubicLen(CWP, P(CWP.x, UAf.y - 2), P(CWP.x - 2, UAf.y), UAf);
  draftSleeve(m, kind, mode, AHb + AHf, right + 6, D);
  return D;
}

function draftSleeve(m, kind, mode, AH, ox, D) {
  const women = kind === 'women', jacket = mode === 'jacket', shirt = !women && mode === 'top';
  const target = AH + (jacket ? 3 : shirt ? 0.5 : 1.5);          // sleeve-cap ease
  const capOf = (bw, h) => 2 * cubicLen(P(-bw / 2, h), P(-bw / 2 + bw * 0.22, h), P(-bw * 0.22, 0), P(0, 0));
  // cap height: about a third of the armhole for set-in sleeves, lower for shirts
  let h = shirt ? AH / 3.8 : (jacket && !women) ? AH / 3.2 : AH / 3.1;
  const minBW = m.arm + (jacket ? (women ? 6 : 7) : shirt ? 8 : 5);  // never tighter than the upper arm plus ease
  let lo = minBW * 0.6, hi = minBW * 2.2;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (capOf(mid, h) < target) lo = mid; else hi = mid; }
  let BW = (lo + hi) / 2;
  if (BW < minBW) {                                               // arm is large: keep the bicep and raise the cap instead
    BW = minBW; let a = 4, b = 34;
    for (let i = 0; i < 50; i++) { const mid = (a + b) / 2; if (capOf(BW, mid) < target) a = mid; else b = mid; }
    h = (a + b) / 2;
  }
  const WW = m.wrist + (jacket ? 11 : (women ? 7 : 9));
  const cx = ox + BW / 2, S = m.slen;
  D.pieces.push({ d: `M${fx(cx - BW / 2)} ${fx(h)} C${fx(cx - BW / 2 + BW * 0.22)} ${fx(h)} ${fx(cx - BW * 0.22)} 0 ${fx(cx)} 0 C${fx(cx + BW * 0.22)} 0 ${fx(cx + BW / 2 - BW * 0.22)} ${fx(h)} ${fx(cx + BW / 2)} ${fx(h)} L${fx(cx + WW / 2)} ${fx(S)} L${fx(cx - WW / 2)} ${fx(S)} Z`, fill: 'rgba(176,141,87,.05)' });
  const elbow = h + (S - h) * 0.45;
  D.dashed.push(`M${fx(cx - BW / 2)} ${fx(h)} H${fx(cx + BW / 2)}`, `M${fx(cx - BW / 2 + (BW - WW) / 2 * 0.45)} ${fx(elbow)} H${fx(cx + BW / 2 - (BW - WW) / 2 * 0.45)}`);
  D.grains.push({ x: cx, y1: h + 3, y2: S - 4 });
  D.labels.push({ x: cx + 1, y: h + 8, s: 'SLEEVE', size: 1.4, anchor: 'start' }, { x: cx + 1, y: h + 10, s: 'Cut 2', size: 0.8, w: 400, anchor: 'start' },
    { x: cx - BW / 2 + 1, y: h - 0.6, s: 'back', size: 0.7, w: 400, anchor: 'start' }, { x: cx + BW / 2 - 1, y: h - 0.6, s: 'front', size: 0.7, w: 400, anchor: 'end' },
    { x: cx, y: elbow - 0.5, s: 'elbow', size: 0.7, w: 400 });
  D.groups.push({ x1: ox - 1, y1: -1, x2: ox + BW + 1, y2: S + 1 });
}

/* ---------- SKIRT ---------- */
function draftSkirt(m, kind, D) {
  const HW = m.hip / 2 + 2, xs = HW / 2, len = m.sklen, wh = m.wh;
  const need = m.waist / 2 + 1, E = Math.max(0, HW - need);
  const s = E * 0.2, bd = E * 0.35 / 2, fd = E * 0.25, R = 1.25;
  const yB = (x) => -R * Math.pow(x / (xs - s), 2.2);
  const yF = (x) => -R * Math.pow((HW - x) / (HW - xs - s), 2.2);
  const back = [`M0 0`];
  for (const [c, l] of [[xs * 0.33, 14], [xs * 0.66, 13]]) back.push(`L${fx(c - bd / 2)} ${fx(yB(c - bd / 2))} L${fx(c)} ${fx(l)} L${fx(c + bd / 2)} ${fx(yB(c + bd / 2))}`);
  back.push(`L${fx(xs - s)} ${fx(-R)} C${fx(xs - s * 0.3)} ${fx(wh * 0.2)} ${fx(xs)} ${fx(wh * 0.55)} ${fx(xs)} ${fx(wh)} L${fx(xs)} ${fx(len)} L0 ${fx(len)} Z`);
  const fc = HW - (HW - xs) * 0.4;
  const front = [`M${fx(HW)} 0 L${fx(fc + fd / 2)} ${fx(yF(fc + fd / 2))} L${fx(fc)} 10 L${fx(fc - fd / 2)} ${fx(yF(fc - fd / 2))}`,
    `L${fx(xs + s)} ${fx(-R)} C${fx(xs + s * 0.3)} ${fx(wh * 0.2)} ${fx(xs)} ${fx(wh * 0.55)} ${fx(xs)} ${fx(wh)} L${fx(xs)} ${fx(len)} L${fx(HW)} ${fx(len)} Z`];
  D.pieces.push({ d: back.join(' '), fill: 'rgba(176,141,87,.07)' }, { d: front.join(' '), fill: 'rgba(12,11,10,.03)' });
  D.guides.push({ y: wh, x1: 0, x2: HW, label: 'hip line' });
  D.grains.push({ x: xs / 2, y1: wh + 6, y2: len - 6 }, { x: xs + (HW - xs) / 2, y1: wh + 6, y2: len - 6 });
  D.labels.push({ x: xs / 2, y: wh + 4, s: 'BACK', size: 1.6 }, { x: xs / 2, y: wh + 5.6, s: 'Cut 2 (CB seam)', size: 0.8, w: 400 },
    { x: xs + (HW - xs) / 2, y: wh + 4, s: 'FRONT', size: 1.6 }, { x: xs + (HW - xs) / 2, y: wh + 5.6, s: 'Cut 1 on fold', size: 0.8, w: 400 },
    { x: 0.5, y: wh - 1, s: 'CB', size: 0.8, anchor: 'start' }, { x: HW - 0.5, y: wh - 1, s: 'CF', size: 0.8, anchor: 'end' });
  D.groups.push({ x1: -1, y1: -3, x2: HW + 1, y2: len + 1 });
  return D;
}

/* ---------- PANTS ---------- */
function draftPants(m, kind, D) {
  const women = kind === 'women';
  const R = m.rise + 1, yH = R - R / 3, OL = m.oleg, yK = R + (OL - R) / 2 - 5;
  // front (side seam on the left, centre front on the right)
  const xF = m.hip / 4 + 0.5, ext = m.hip / 16 + (women ? 0.5 : 1);
  const cp = P(xF + ext, R), xc = (xF + ext) / 2;
  const hwF = m.hem / 2 - 1, kF = hwF / 2 + 1;
  const CFw = P(xF - 1, 0), sideW = P(xF - 1 - (m.waist / 4 + 2.5), 0);
  const front = [`M${pt(CFw)} L${fx(xF)} ${fx(yH)} C${fx(xF)} ${fx(yH + (R - yH) * 0.6)} ${fx(xF + ext * 0.25)} ${fx(R)} ${pt(cp)}`,
    `C${fx(cp.x - 1.5)} ${fx(R + 6)} ${fx(xc + kF)} ${fx(yK - 8)} ${fx(xc + kF)} ${fx(yK)} L${fx(xc + hwF / 2)} ${fx(OL)} L${fx(xc - hwF / 2)} ${fx(OL)} L${fx(xc - kF)} ${fx(yK)}`,
    `C${fx(xc - kF)} ${fx(yK - 10)} 0 ${fx(yH + 8)} 0 ${fx(yH)} C0 ${fx(yH * 0.4)} ${fx(sideW.x + 0.2)} ${fx(yH * 0.15)} ${pt(sideW)}`,
    `L${fx(xc - 1)} 0 L${fx(xc)} 8 L${fx(xc + 1)} 0 Z`];
  // back, drawn to the right of the front
  const ox = xF + ext + 8;
  const xB = m.hip / 4 + 1.5, extB = m.hip / 8 + (women ? 1 : 1.5);
  const cpB = P(xB + extB, R + 1), xcb = (xB + extB) / 2 - 0.5;
  const hwB = m.hem / 2 + 1, kB = hwB / 2 + 1;
  const CBw = P(xB - 2, -2.5), sideWB = P(CBw.x - (m.waist / 4 + 4.5), 0);   // back waist = waist/4 + 0.5 after two 2 cm darts
  const wy = (x) => sideWB.y + (CBw.y - sideWB.y) * (x - sideWB.x) / (CBw.x - sideWB.x);
  const X = (x) => fx(x + ox);
  const dl = [sideWB.x + (CBw.x - sideWB.x) / 3, sideWB.x + (CBw.x - sideWB.x) * 2 / 3];
  const back = [`M${X(CBw.x)} ${fx(CBw.y)} L${X(xB)} ${fx(yH)} C${X(xB)} ${fx(yH + (R + 1 - yH) * 0.6)} ${X(xB + extB * 0.3)} ${fx(R + 1)} ${X(cpB.x)} ${fx(cpB.y)}`,
    `C${X(cpB.x - 2)} ${fx(R + 8)} ${X(xcb + kB)} ${fx(yK - 8)} ${X(xcb + kB)} ${fx(yK)} L${X(xcb + hwB / 2)} ${fx(OL)} L${X(xcb - hwB / 2)} ${fx(OL)} L${X(xcb - kB)} ${fx(yK)}`,
    `C${X(xcb - kB)} ${fx(yK - 10)} ${X(0)} ${fx(yH + 8)} ${X(0)} ${fx(yH)} C${X(0)} ${fx(yH * 0.4)} ${X(sideWB.x + 0.2)} ${fx(yH * 0.15)} ${X(sideWB.x)} ${fx(sideWB.y)}`,
    ...dl.map((c, i) => `L${X(c - 1)} ${fx(wy(c - 1))} L${X(c)} ${fx(wy(c) + (i ? 10 : 12))} L${X(c + 1)} ${fx(wy(c + 1))}`), 'Z'];
  D.pieces.push({ d: front.join(' '), fill: 'rgba(12,11,10,.03)' }, { d: back.join(' '), fill: 'rgba(176,141,87,.07)' });
  const right = ox + xB + extB;
  const left = Math.min(0, sideW.x, sideWB.x + ox);
  D.guides.push({ y: yH, x1: left, x2: right, label: 'hip line' }, { y: R, x1: left, x2: right, label: 'crotch line' }, { y: yK, x1: left, x2: right, label: 'knee line' });
  D.grains.push({ x: xc, y1: R + 4, y2: OL - 6 }, { x: xcb + ox, y1: R + 6, y2: OL - 6 });
  D.labels.push({ x: xc, y: yK + 8, s: 'FRONT', size: 1.6 }, { x: xc, y: yK + 9.6, s: 'Cut 2', size: 0.8, w: 400 },
    { x: xcb + ox, y: yK + 8, s: 'BACK', size: 1.6 }, { x: xcb + ox, y: yK + 9.6, s: 'Cut 2', size: 0.8, w: 400 },
    { x: xc, y: OL - 2, s: 'crease line', size: 0.6, w: 400 }, { x: xcb + ox, y: OL - 2, s: 'crease line', size: 0.6, w: 400 });
  D.groups.push({ x1: left - 1, y1: -0.5, x2: xF + ext + 2, y2: OL + 0.3 }, { x1: ox + Math.min(0, sideWB.x) - 1, y1: -3, x2: right + 1, y2: OL + 0.3 });
  // free space between the legs for the test square
  const gx1 = xc + kF + 1.2, gx2 = ox + xcb - kB - 1.2;
  if (gx2 - gx1 >= 10.6) D.testSpot = { x: gx1 + (gx2 - gx1 - 10.5) / 2, y: OL - 14 };
  return D;
}

function draftAll(m, kind, type) {
  const D = newDraft();
  if (type === 'skirt') draftSkirt(m, kind, D);
  else if (type === 'pants') draftPants(m, kind, D);
  else draftBodice(m, kind, type, D);
  // overall bounds
  const g = D.groups;
  D.x1 = Math.min(...g.map(a => a.x1)); D.y1 = Math.min(...g.map(a => a.y1));
  D.x2 = Math.max(...g.map(a => a.x2)); D.y2 = Math.max(...g.map(a => a.y2));
  return D;
}

const BLOCK_NAMES = { top: 'top', dress: 'dress', skirt: 'skirt', pants: 'pants', jacket: 'jacket' };
function blockTitle(kind, type) {
  const who = kind === 'women' ? "Women's" : "Men's";
  const what = type === 'top' && kind === 'men' ? 'shirt / top' : BLOCK_NAMES[type];
  return `${who} ${what} block`;
}

/* ---------- SVG ---------- */
function blockBody(D, title, opts = {}) {
  const ink = '#0c0b0a', gold = '#a8844c';
  const txt = (l) => `<text x="${fx(l.x)}" y="${fx(l.y)}" font-family="Helvetica,Arial,sans-serif" font-size="${l.size || 1}" font-weight="${(l.w || 500) >= 500 ? 'bold' : 'normal'}" text-anchor="${l.anchor || 'middle'}" fill="${ink}">${l.s}</text>`;
  const grain = (g) => `<path d="M${fx(g.x)} ${fx(g.y1)} V${fx(g.y2)} M${fx(g.x - 0.6)} ${fx(g.y1 + 1.2)} L${fx(g.x)} ${fx(g.y1)} L${fx(g.x + 0.6)} ${fx(g.y1 + 1.2)} M${fx(g.x - 0.6)} ${fx(g.y2 - 1.2)} L${fx(g.x)} ${fx(g.y2)} L${fx(g.x + 0.6)} ${fx(g.y2 - 1.2)}" stroke="${ink}" stroke-width="0.04" fill="none"/>`;
  let s = '';
  for (const g of D.guides) s += `<path d="M${fx(g.x1)} ${fx(g.y)} H${fx(g.x2)}" stroke="${gold}" stroke-width="0.06" stroke-dasharray="0.5 0.4" fill="none"/>` + txt({ x: (g.x1 + g.x2) / 2, y: g.y - 0.4, s: g.label, size: 0.7, w: 400 });
  for (const p of D.pieces) s += `<path d="${p.d}" fill="${opts.plain ? 'none' : p.fill}" stroke="${ink}" stroke-width="0.07" stroke-linejoin="round"/>`;
  for (const d of D.darts) s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="0.05" stroke-linejoin="round"/>`;
  for (const d of D.dashed) s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="0.04" stroke-dasharray="0.6 0.4"/>`;
  for (const g of D.grains) s += grain(g);
  for (const d of D.dots) s += `<circle cx="${fx(d.x)}" cy="${fx(d.y)}" r="0.35" fill="${gold}"/>` + txt({ x: d.x + 1, y: d.y + 0.4, s: d.label, size: 0.8, anchor: 'start' });
  for (const l of D.labels) s += txt(l);
  return s;
}
/* 10 cm test square with a 4 inch line, drawn at x,y */
function testSquare(x, y) {
  const ink = '#0c0b0a';
  return `<rect x="${fx(x)}" y="${fx(y)}" width="10" height="10" fill="none" stroke="${ink}" stroke-width="0.1"/>
    <text x="${fx(x + 5)}" y="${fx(y + 4.6)}" font-family="Helvetica,Arial,sans-serif" font-size="0.9" font-weight="bold" text-anchor="middle" fill="${ink}">10 cm x 10 cm</text>
    <text x="${fx(x + 5)}" y="${fx(y + 6)}" font-family="Helvetica,Arial,sans-serif" font-size="0.6" text-anchor="middle" fill="${ink}">measure to check the scale</text>
    <path d="M${fx(x)} ${fx(y + 11.2)} h10.16" stroke="${ink}" stroke-width="0.1"/><path d="M${fx(x)} ${fx(y + 10.8)} v0.8 M${fx(x + 10.16)} ${fx(y + 10.8)} v0.8" stroke="${ink}" stroke-width="0.1"/>
    <text x="${fx(x + 5.08)}" y="${fx(y + 12.4)}" font-family="Helvetica,Arial,sans-serif" font-size="0.6" text-anchor="middle" fill="${ink}">4 inches</text>`;
}

function blockSVG(m, kind, type) {
  const D = draftAll(m, kind, type);
  const pad = 2, vx = D.x1 - pad, vy = D.y1 - pad, vw = D.x2 - D.x1 + pad * 2, vh = D.y2 - D.y1 + pad * 2 + 4;
  const foot = `<text x="${fx(D.x2)}" y="${fx(D.y2 + 3)}" font-family="Helvetica,Arial,sans-serif" font-size="1" font-weight="bold" text-anchor="end" fill="#0c0b0a">HATILLE · ${blockTitle(kind, type).toUpperCase()}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx(vx)} ${fx(vy)} ${fx(vw)} ${fx(vh)}" width="100%" style="background:#fff;max-height:78vh">${blockBody(D)}${foot}</svg>`;
}

/* ---------- PDF output ---------- */
const PAPER = {
  shop: [[60.96, 91.44, '24 × 36 in'], [91.44, 121.92, '36 × 48 in'], [84.1, 118.9, 'A0']],
  letter: [21.59, 27.94], a4: [21.0, 29.7],
};
let _pdfLibs;
function loadPdfLibs() {
  if (_pdfLibs) return _pdfLibs;
  const add = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  _pdfLibs = add('assets/vendor/jspdf.umd.min.js').then(() => add('assets/vendor/svg2pdf.umd.min.js'));
  return _pdfLibs;
}
function svgEl(inner, vx, vy, vw, vh) {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:10px;height:10px;overflow:hidden';
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fx(vx)} ${fx(vy)} ${fx(vw)} ${fx(vh)}" width="${fx(vw)}" height="${fx(vh)}">${inner}</svg>`;
  document.body.appendChild(host);
  return { el: host.firstElementChild, done: () => host.remove() };
}
async function placeSvg(doc, inner, vx, vy, vw, vh, x, y) {
  const s = svgEl(inner, vx, vy, vw, vh);
  try { await doc.svg(s.el, { x, y, width: vw, height: vh }); } finally { s.done(); }
}
function measureTable(rows, unit) { return rows.map(([k, v]) => `${k}: ${v} ${unit}`); }

/* Print-shop file: whole pieces at 100% on 24×36, 36×48 in or A0 sheets */
async function blockShopPDF(m, kind, type, unit, rows) {
  await loadPdfLibs();
  const { jsPDF } = window.jspdf;
  const D = draftAll(m, kind, type), body = blockBody(D, '', { plain: true });
  const M = 1.2, head = D.testSpot ? 7 : 13.5;   // margins and header band, cm
  const bodyT = D.testSpot ? body + testSquare(D.testSpot.x, D.testSpot.y) : body;
  const fits = (w, h, p) => (w + 2 * M <= p[0] && h + 2 * M + head <= p[1]) ? [p[0], p[1], p[2]] : (w + 2 * M <= p[1] && h + 2 * M + head <= p[0]) ? [p[1], p[0], p[2]] : null;
  const pick = (w, h) => { for (const p of PAPER.shop.slice(0, 2)) { const f = fits(w, h, p); if (f) return f; } return null; };
  const all = { x1: D.x1, y1: D.y1, x2: D.x2, y2: D.y2 };
  let sheets = [];
  const whole = pick(all.x2 - all.x1, all.y2 - all.y1);
  if (whole) sheets = [{ g: all, paper: whole }];
  else sheets = D.groups.map(g => ({ g, paper: pick(g.x2 - g.x1, g.y2 - g.y1) || [Math.max(91.44, g.x2 - g.x1 + 2 * M), g.y2 - g.y1 + 2 * M + head, 'custom roll length'] }));
  let doc;
  for (let i = 0; i < sheets.length; i++) {
    const { g, paper } = sheets[i];
    const orient = paper[0] > paper[1] ? 'l' : 'p';
    if (!doc) doc = new jsPDF({ unit: 'cm', format: [paper[0], paper[1]], orientation: orient });
    else doc.addPage([paper[0], paper[1]], orient);
    const pw = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('HATILLE', M, M + 1.2);
    doc.setFontSize(14); doc.text(`${blockTitle(kind, type)} · sheet ${i + 1} of ${sheets.length} (${paper[2]})`, M, M + 2.3);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(['PRINT AT 100% / ACTUAL SIZE. Do not "fit to page" or scale.', 'Ask for an engineering (blueprint) print, black and white, on 20 lb bond paper.', 'Check the 10 cm square before cutting. Seam allowances are not included.'], M, M + 3.3);
    const tbl = measureTable(rows, unit);
    const colW = 16; for (let c = 0; c * 6 < tbl.length; c++) doc.text(tbl.slice(c * 6, c * 6 + 6), M + 30 + c * colW, M + 1.2);
    if (!D.testSpot) await placeSvg(doc, testSquare(0, 0), -0.1, -0.1, 10.5, 12.8, pw - M - 10.5, M);
    await placeSvg(doc, bodyT, g.x1, g.y1, g.x2 - g.x1, g.y2 - g.y1, M, M + head);
  }
  return doc;
}

/* Home-printer file: tiles on Letter or A4 with overlap marks and an assembly map */
async function blockTilePDF(m, kind, type, unit, rows, size) {
  await loadPdfLibs();
  const { jsPDF } = window.jspdf;
  const D = draftAll(m, kind, type), body = blockBody(D, '', { plain: true });
  const [PW, PH] = PAPER[size];
  const mg = 1.0, TW = PW - 2 * mg, TH = PH - 2 * mg - 0.8;   // printable tile area, cm
  const x0 = D.x1 - 1, y0 = D.y1 - 1, W = D.x2 - D.x1 + 2, H = D.y2 - D.y1 + 2;
  const cols = Math.ceil(W / TW), rws = Math.ceil(H / TH);
  const doc = new jsPDF({ unit: 'cm', format: [PW, PH], orientation: 'p' });
  // page 1: instructions, test square, assembly map
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('HATILLE', mg, mg + 0.8);
  doc.setFontSize(13); doc.text(blockTitle(kind, type), mg, mg + 1.6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(doc.splitTextToSize(`Print every page at 100% / "Actual size" (turn off "Fit to page"). Measure the 10 cm square on this page. Trim each page along its border line and tape pages together in order: A1, A2… across, then B, C… down. ${cols * rws} tile pages, ${cols} across × ${rws} down. Seam allowances are not included.`, PW - 2 * mg), mg, mg + 2.4);
  await placeSvg(doc, testSquare(0, 0), -0.1, -0.1, 10.5, 12.8, mg, mg + 4.4);
  doc.text(measureTable(rows, unit), mg + 12, mg + 4.8);
  // map
  const mapW = PW - 2 * mg, mapH = PH - (mg + 18.5) - mg, k = Math.min(mapW / W, mapH / H);
  const mx = mg, my = mg + 18.5;
  const sm = svgEl(body, x0, y0, W, H);
  try { await doc.svg(sm.el, { x: mx, y: my, width: W * k, height: H * k }); } finally { sm.done(); }
  doc.setDrawColor(168, 132, 76); doc.setLineWidth(0.02); doc.setFontSize(7);
  for (let r = 0; r < rws; r++) for (let c = 0; c < cols; c++) {
    const tx = mx + c * TW * k, ty = my + r * TH * k;
    doc.rect(tx, ty, Math.min(TW, W - c * TW) * k, Math.min(TH, H - r * TH) * k);
    doc.text(String.fromCharCode(65 + r) + (c + 1), tx + 0.15, ty + 0.35);
  }
  // tiles
  for (let r = 0; r < rws; r++) for (let c = 0; c < cols; c++) {
    doc.addPage([PW, PH], 'p');
    const id = String.fromCharCode(65 + r) + (c + 1);
    await placeSvg(doc, body, x0 + c * TW, y0 + r * TH, TW, TH, mg, mg + 0.8);
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.02); doc.setLineDashPattern([0.3, 0.2], 0);
    doc.rect(mg, mg + 0.8, TW, TH); doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(168, 132, 76);
    doc.text(id, mg, mg + 0.5); doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.text(`${blockTitle(kind, type)} · ${id} · row ${r + 1}/${rws}, column ${c + 1}/${cols} · print at 100%`, PW - mg, mg + 0.5, { align: 'right' });
    if (c > 0) doc.text('< joins ' + String.fromCharCode(65 + r) + c, mg + 0.1, mg + 0.8 + TH / 2);
    if (c < cols - 1) doc.text('joins ' + String.fromCharCode(65 + r) + (c + 2) + ' >', mg + TW - 0.1, mg + 0.8 + TH / 2, { align: 'right' });
  }
  return doc;
}
