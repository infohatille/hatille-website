/* Hatille virtual try-on engine
   Runs entirely in the visitor's browser. Photos are never uploaded.
   - Body detection (MediaPipe Pose) finds shoulders, hips, arms
   - Body segmentation (MediaPipe multiclass selfie) finds hair, skin and clothes
   - Garments are cut out, fitted to the body, shaded with the photo's own light,
     and arms and hair are layered back on top. */
(function () {
  const CFG = Object.assign({
    bundle: '/assets/vendor/mediapipe/vision_bundle.mjs',
    wasm: '/assets/vendor/mediapipe/wasm',
    pose: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    seg: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
  }, window.TRYON_CFG || {});

  /* ---------- model loading (once, lazily) ---------- */
  let baseP = null, poseP = null, segP = null;
  const base = () => baseP || (baseP = (async () => { const v = await import(CFG.bundle); const fs = await v.FilesetResolver.forVisionTasks(CFG.wasm); return { v, fs }; })());
  const loadPose = () => poseP || (poseP = base().then(({ v, fs }) => v.PoseLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: CFG.pose, delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 1,
    minPoseDetectionConfidence: 0.35, minPosePresenceConfidence: 0.35
  })));
  const loadSeg = () => segP || (segP = base().then(({ v, fs }) => v.ImageSegmenter.createFromOptions(fs, {
    baseOptions: { modelAssetPath: CFG.seg, delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false
  })).catch(e => { console.warn('Segmentation unavailable', e); return null; }));

  /* ---------- small helpers ---------- */
  const V = (x, y) => ({ x, y });
  const add = (a, b) => V(a.x + b.x, a.y + b.y), sub = (a, b) => V(a.x - b.x, a.y - b.y), mul = (a, k) => V(a.x * k, a.y * k);
  const len = a => Math.hypot(a.x, a.y), norm = a => { const l = len(a) || 1; return V(a.x / l, a.y / l); }, mid = (a, b) => mul(add(a, b), 0.5);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function canvasFrom(src, maxSide) {
    const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height;
    const k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c;
  }
  function distSeg(p, a, b) { const ab = sub(b, a), t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / ((ab.x * ab.x + ab.y * ab.y) || 1), 0, 1); return len(sub(p, add(a, mul(ab, t)))); }
  function boxBlur(src, w, h, r) { // separable box blur, twice ≈ gaussian
    r = Math.max(1, Math.round(r)); let a = src, b = new Float32Array(w * h);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += a[row + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { b[row + x] = acc / (2 * r + 1); acc += a[row + clamp(x + r + 1, 0, w - 1)] - a[row + clamp(x - r, 0, w - 1)]; } }
      const c = new Float32Array(w * h);
      for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { c[y * w + x] = acc / (2 * r + 1); acc += b[clamp(y + r + 1, 0, h - 1) * w + x] - b[clamp(y - r, 0, h - 1) * w + x]; } }
      a = c;
    }
    return a;
  }

  async function detectPose(canvas) {
    const pose = await loadPose();
    const r = pose.detect(canvas); const lm = r.landmarks && r.landmarks[0];
    if (!lm) return null;
    return lm.map(p => ({ x: p.x * canvas.width, y: p.y * canvas.height, v: p.visibility == null ? 1 : p.visibility }));
  }
  async function segment(canvas) {
    const seg = await loadSeg(); if (!seg) return null;
    const r = seg.segment(canvas); const m = r.categoryMask; if (!m) { r.close && r.close(); return null; }
    const out = { arr: m.getAsUint8Array().slice(), w: m.width, h: m.height }; r.close && r.close(); return out;
  }
  // categories: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 accessories
  const catAt = (S, W, H, x, y) => { if (!S) return -1; const sx = clamp(Math.floor(x * S.w / W), 0, S.w - 1), sy = clamp(Math.floor(y * S.h / H), 0, S.h - 1); return S.arr[sy * S.w + sx]; };

  /* ---------- body geometry from landmarks ---------- */
  function bodyGeom(lm, W, H) {
    if (!lm) return null;
    const ok = i => lm[i] && lm[i].v > 0.45 && lm[i].x > -0.05 * W && lm[i].x < 1.05 * W && lm[i].y > -0.05 * H && lm[i].y < 1.04 * H;
    if (!ok(11) || !ok(12)) return null;
    const a = lm[11].x < lm[12].x ? lm[11] : lm[12], b = lm[11].x < lm[12].x ? lm[12] : lm[11];
    const sw = len(sub(b, a)); if (sw < W * 0.06) return null;
    const sm = mid(a, b); let ex = norm(sub(b, a)); let ey = V(-ex.y, ex.x); if (ey.y < 0) ey = mul(ey, -1);
    const hipsOk = ok(23) && ok(24);
    const hm = hipsOk ? mid(lm[23], lm[24]) : add(sm, mul(ey, sw * 1.5));
    // keep the torso axis consistent with the hips when they are known
    const axis = norm(sub(hm, sm)); if (hipsOk && axis.y > 0.5) { ey = axis; ex = V(ey.y, -ey.x); if (ex.x < 0) ex = mul(ex, -1); }
    const torso = len(sub(hm, sm));
    const hipW = hipsOk ? len(sub(lm[23], lm[24])) : sw * 0.7;
    const arms = [];
    [[11, 13], [13, 15], [12, 14], [14, 16]].forEach(([i, j]) => { if (ok(i) && ok(j)) arms.push([lm[i], lm[j]]); });
    const hands = [15, 16, 17, 18, 19, 20].filter(ok).map(i => lm[i]);
    const kneeB = (ok(25) || ok(26)) ? Math.max(...[25, 26].filter(ok).map(i => (lm[i].x - sm.x) * ey.x + (lm[i].y - sm.y) * ey.y)) : torso * 2.1;
    return { sm, hm, ex, ey, sw, torso, hipW, arms, hands, hipsOk, kneeB };
  }
  function nearArm(G, p, k) { const r = G.sw * k; for (const [a, b] of G.arms) if (distSeg(p, a, b) < r) return true; for (const h of G.hands) if (len(sub(p, h)) < G.sw * 0.2) return true; return false; }
  // width of the body at a point on the torso axis, measured across, ignoring arms
  function bodyWidthAt(P, c) {
    const S = P.seg, G = P.geom; if (!S || !G) return 0;
    let w = 0;
    for (const dir of [-1, 1]) {
      let d = 0; for (; d < G.sw * 1.3; d += 1.5) {
        const p = add(c, mul(G.ex, d * dir)); if (p.x < 0 || p.y < 0 || p.x >= P.W || p.y >= P.H) break;
        const k = catAt(S, P.W, P.H, p.x, p.y); if (k === 0 || k === 1) break; if (d > G.sw * 0.12 && nearArm(G, p, 0.13)) break;
      }
      w += d;
    }
    return w;
  }

  /* ---------- person ---------- */
  async function analysePerson(img, onStatus) {
    const c = canvasFrom(img, 1100), W = c.width, H = c.height;
    onStatus && onStatus('Finding your shoulders and hips…');
    const lm = await detectPose(c);
    onStatus && onStatus('Reading hair, skin and clothing…');
    const seg = await segment(c);
    const geom = bodyGeom(lm, W, H);
    const P = { canvas: c, W, H, lm, seg, geom };
    // lighting: blurred luminance of the photo
    const d = c.getContext('2d').getImageData(0, 0, W, H).data, L = new Float32Array(W * H);
    for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    P.lum = boxBlur(L, W, H, geom ? geom.sw * 0.2 : W * 0.06);
    // occluders: hair and arms/hands (skin only), feathered
    if (seg && geom) {
      const hair = new Float32Array(W * H), arm = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = catAt(seg, W, H, x, y), i = y * W + x;
        if (k === 1) hair[i] = 1;
        else if (k === 2 && nearArm(geom, V(x, y), 0.2)) arm[i] = 1;
      }
      P.hairMask = boxBlur(hair, W, H, 1.2); P.armMask = boxBlur(arm, W, H, 1.2);
    }
    return P;
  }

  /* ---------- garment cut-out ---------- */
  function rowExtents(alpha, w, h) {
    const ext = new Array(h);
    for (let y = 0; y < h; y++) { let a = -1, b = -1; for (let x = 0; x < w; x++) if (alpha[y * w + x] > 100) { if (a < 0) a = x; b = x; } ext[y] = a < 0 ? null : [a, b]; }
    return ext;
  }
  function floodCutout(c) {
    const w = c.width, h = c.height, ctx = c.getContext('2d'), img = ctx.getImageData(0, 0, w, h), d = img.data;
    // background colour from the border
    const bs = []; const pushB = (x, y) => { const i = (y * w + x) * 4; bs.push([d[i], d[i + 1], d[i + 2]]); };
    for (let x = 0; x < w; x += 2) { pushB(x, 0); pushB(x, h - 1); } for (let y = 0; y < h; y += 2) { pushB(0, y); pushB(w - 1, y); }
    const med = k => bs.map(p => p[k]).sort((a, b) => a - b)[bs.length >> 1]; const bg = [med(0), med(1), med(2)];
    const dist = i => { const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2]; return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db); };
    const spread = bs.map(p => { const dr = p[0] - bg[0], dg = p[1] - bg[1], db = p[2] - bg[2]; return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db); }).sort((a, b) => a - b);
    const p90 = spread[Math.floor(spread.length * 0.9)];
    const tol = clamp(14 + p90 * 1.2, 16, 60), busy = p90 > 40;
    const isBg = new Uint8Array(w * h), st = [];
    for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
    while (st.length) { const p = st.pop(); if (isBg[p]) continue; if (dist(p * 4) > tol) continue; isBg[p] = 1; const x = p % w, y = (p / w) | 0; if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w); }
    // keep the largest garment piece
    const lab = new Int32Array(w * h); let best = 0, bestN = 0, id = 0;
    for (let s = 0; s < w * h; s++) { if (isBg[s] || lab[s]) continue; id++; let n = 0; st.push(s); lab[s] = id; while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p / w) | 0; const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]; for (const q of nb) if (q >= 0 && !isBg[q] && !lab[q]) { lab[q] = id; st.push(q); } } if (n > bestN) { bestN = n; best = id; } }
    const A = new Float32Array(w * h); for (let i = 0; i < w * h; i++) A[i] = lab[i] === best ? 1 : 0;
    const As = boxBlur(A, w, h, 1);
    for (let i = 0; i < w * h; i++) d[i * 4 + 3] = Math.round(255 * clamp((As[i] - 0.4) / 0.55, 0, 1));
    ctx.putImageData(img, 0, 0);
    return { busy, coverage: bestN / (w * h), whiteOnWhite: bg[0] > 225 && bg[1] > 225 && bg[2] > 225 };
  }
  function trim(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { c, x0: 0, y0: 0 };
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0); return { c: o, x0, y0 };
  }
  const SHOULDER_ROW = { dress: 0.035, top: 0.08, jacket: 0.06 };

  /* prepare(img, type, {flat:true}) → garment model with anchor frame */
  async function prepareGarment(img, type, opts) {
    opts = opts || {};
    const c = canvasFrom(img, 1000), W = c.width, H = c.height; let note = '';
    // 1) worn on a model? use body detection + clothes segmentation
    if (!opts.flat) {
      const lm = await detectPose(c), G = bodyGeom(lm, W, H), S = G ? await segment(c) : null;
      if (G && S) {
        const ctx = c.getContext('2d'), im = ctx.getImageData(0, 0, W, H), d = im.data, A = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (catAt(S, W, H, x, y) !== 4) continue;
          const b = (x - G.sm.x) * G.ey.x + (y - G.sm.y) * G.ey.y; // distance down the body
          if ((type === 'top' || type === 'jacket') && b > G.torso * 1.45) continue;
          if ((type === 'skirt' || type === 'pants') && b < G.torso * 0.6) continue;
          A[y * W + x] = 1;
        }
        const As = boxBlur(A, W, H, 1); let n = 0;
        for (let i = 0; i < W * H; i++) { d[i * 4 + 3] = Math.round(255 * clamp((As[i] - 0.15) / 0.7, 0, 1)); if (A[i]) n++; }
        if (n > W * H * 0.02) {
          ctx.putImageData(im, 0, 0);
          return { canvas: c, type, worn: true, O: add(G.sm, mul(G.ey, -0.1 * G.sw)), ex: G.ex, ey: G.ey, sw: G.sw, torso: G.hipsOk ? G.torso : null, ext: rowExtents(alphaOf(c), W, H), note: 'Detected a model in the photo and lifted the garment off them.' };
        }
      }
    }
    // 2) flat product photo: remove the plain background
    const info = floodCutout(c);
    if (info.busy) note = 'The background of this photo is busy, so the cut-out may be rough. A plain background works best.';
    else if (info.coverage > 0.92 || info.coverage < 0.03) note = 'We could not separate the garment from the background. Try a photo on a plain, contrasting background.';
    const t = trim(c), g = t.c, w = g.width, h = g.height, ext = rowExtents(alphaOf(g), w, h);
    let O, gw;
    if (type === 'skirt' || type === 'pants') {
      const r = Math.round(h * 0.02); const e = ext[r] || ext.find(Boolean) || [0, w - 1];
      O = V((e[0] + e[1]) / 2, 0); gw = e[1] - e[0] + 1;
    } else {
      const r = Math.round(h * (SHOULDER_ROW[type] || 0.05)); let a = 0, b = 0, n = 0;
      for (let y = Math.max(0, r - 2); y <= Math.min(h - 1, r + 2); y++) if (ext[y]) { a += ext[y][0]; b += ext[y][1]; n++; }
      if (!n) { a = 0; b = w - 1; n = 1; }
      a /= n; b /= n; O = V((a + b) / 2, r); gw = b - a + 1;
      // sleeves spread out make the shoulder line look too wide: measure the chest below the sleeves instead
      const al = alphaOf(g), cx = Math.round(O.x), runs = [];
      for (let y = Math.round(h * 0.1); y < Math.round(h * 0.5); y++) {
        const row = y * w; if (al[row + cx] < 100) continue;
        let l = cx, rr = cx; while (l > 0 && al[row + l - 1] > 100) l--; while (rr < w - 1 && al[row + rr + 1] > 100) rr++;
        const e = ext[y]; if (!e) continue; runs.push({ y, run: rr - l + 1, full: e[1] - e[0] + 1 });
      }
      const j = runs.findIndex(q => q.run >= q.full * 0.95);              // below the neckline, body and sleeves joined
      const k = j < 0 ? -1 : runs.findIndex((q, i) => i > j && q.run < q.full * 0.85); // first row where the sleeves separate
      if (k > -1) {
        const seg = runs.slice(k, k + Math.max(3, Math.round(h * 0.05))).map(q => q.run).sort((x, y) => x - y);
        const chest = seg[seg.length >> 1];
        if (chest > gw * 0.35 && chest < gw) gw = chest * 1.08;
      } else if (type === 'top' || type === 'jacket') {
        // short sleeves that never separate: use the body width below the sleeves
        const ws = []; for (let y = Math.round(h * 0.5); y < Math.round(h * 0.75); y++) if (ext[y]) ws.push(ext[y][1] - ext[y][0] + 1);
        ws.sort((x, y) => x - y); const body = ws[ws.length >> 1];
        if (body && body < gw * 0.95 && body > gw * 0.45) gw = body * 1.04;
      }
    }
    return { canvas: g, type, worn: false, O, ex: V(1, 0), ey: V(0, 1), gw, ext, note };
  }
  function alphaOf(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; return a; }

  /* ---------- fit: garment frame → person frame ---------- */
  function fit(P, Gm, adj) {
    adj = Object.assign({ size: 1, width: 1, length: 1, dx: 0, dy: 0 }, adj || {});
    const B = P.geom; let Op, ex, ey, sx, sy;
    if (!B) { // no body found: centre it
      ex = V(1, 0); ey = V(0, 1);
      const s = (P.W * 0.42) / (Gm.gw || Gm.sw * 1.25 || P.W * 0.4); sx = sy = s;
      Op = V(P.W / 2, P.H * (Gm.type === 'skirt' || Gm.type === 'pants' ? 0.5 : 0.22));
    } else {
      ex = B.ex; ey = B.ey;
      if (Gm.worn) {
        Op = add(B.sm, mul(B.ey, -0.1 * B.sw));
        sx = B.sw / Gm.sw; sy = Gm.torso && B.hipsOk ? B.torso / Gm.torso : sx;
        sy = clamp(sy, sx * 0.75, sx * 1.35);
      } else if (Gm.type === 'skirt' || Gm.type === 'pants') {
        const wf = Gm.type === 'pants' ? 0.78 : 0.68;
        Op = add(B.sm, mul(sub(B.hm, B.sm), wf));
        const bw = bodyWidthAt(P, Op);
        const target = bw > B.sw * 0.4 ? bw * 1.06 : B.hipW * 1.5;
        sx = sy = target / Gm.gw;
      } else {
        Op = add(B.sm, mul(B.ey, -0.1 * B.sw));
        sx = sy = (B.sw * (Gm.type === 'jacket' ? 1.32 : 1.24)) / Gm.gw;
      }
    }
    sx *= adj.size * adj.width; sy *= adj.size * adj.length; Op = add(Op, V(adj.dx, adj.dy));
    // per-row widening so the body never shows past the garment edges
    const h = Gm.canvas.height, f = new Float32Array(h).fill(1);
    if (B && P.seg && adj.autofit !== false) {
      const raw = new Float32Array(h).fill(1), step = 4;
      for (let y = 0; y < h; y += step) {
        const e = Gm.ext[y]; if (!e) continue;
        const a = (((e[0] + e[1]) / 2) - Gm.O.x) * Gm.ex.x + (y - Gm.O.y) * Gm.ex.y, b = (((e[0] + e[1]) / 2) - Gm.O.x) * Gm.ey.x + (y - Gm.O.y) * Gm.ey.y;
        if (b < (Gm.type === 'skirt' || Gm.type === 'pants' ? 0 : (Gm.gw || Gm.sw) * 0.25)) continue;
        const destB = b * sy; if (destB > B.kneeB + B.sw * 0.2 && Gm.type !== 'pants') continue;
        const c = add(Op, mul(ey, destB));
        const bw = bodyWidthAt(P, c); if (!bw) continue;
        const gwRow = (e[1] - e[0] + 1) * sx; const need = (bw * 1.05) / gwRow;
        for (let k = 0; k < step && y + k < h; k++) raw[y + k] = clamp(need, 1, 1.3);
        void a;
      }
      const r = Math.max(2, Math.round(h * 0.04));
      for (let y = 0; y < h; y++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const v = raw[clamp(y + k, 0, h - 1)]; s += v; n++; } f[y] = s / n; }
    }
    return { Op, ex, ey, sx, sy, f };
  }

  /* ---------- render ---------- */
  function drawGarment(ctx, Gm, T) {
    const g = Gm.canvas, O = Gm.O, exg = Gm.ex, eyg = Gm.ey, h = g.height, band = 3;
    const ca = -(exg.x * O.x + exg.y * O.y), cb = -(eyg.x * O.x + eyg.y * O.y);
    for (let y = 0; y < h; y += band) {
      const fx = T.f[Math.min(h - 1, y + 1)], A1 = T.sx * fx, B1 = T.sy, ex = T.ex, ey = T.ey;
      const m11 = ex.x * A1 * exg.x + ey.x * B1 * eyg.x, m12 = ex.x * A1 * exg.y + ey.x * B1 * eyg.y;
      const m21 = ex.y * A1 * exg.x + ey.y * B1 * eyg.x, m22 = ex.y * A1 * exg.y + ey.y * B1 * eyg.y;
      const tx = T.Op.x + ex.x * A1 * ca + ey.x * B1 * cb, ty = T.Op.y + ex.y * A1 * ca + ey.y * B1 * cb;
      ctx.setTransform(m11, m21, m12, m22, tx, ty);
      const hh = Math.min(band + 1, h - y); ctx.drawImage(g, 0, y, g.width, hh, 0, y, g.width, hh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function render(out, P, Gm, T, opts) {
    opts = Object.assign({ light: 0.8, arms: true, hair: true, shadow: true }, opts || {});
    const W = P.W, H = P.H; out.width = W; out.height = H;
    const ctx = out.getContext('2d'); ctx.drawImage(P.canvas, 0, 0);
    if (!Gm) return;
    // garment layer
    const L = document.createElement('canvas'); L.width = W; L.height = H; const lx = L.getContext('2d');
    drawGarment(lx, Gm, T);
    const im = lx.getImageData(0, 0, W, H), d = im.data;
    if (opts.light > 0) {
      const samp = []; for (let i = 0; i < W * H; i += 7) if (d[i * 4 + 3] > 200) samp.push(P.lum[i]);
      samp.sort((a, b) => a - b); const ref = samp.length ? samp[samp.length >> 1] : 128;
      for (let y = 0; y < H; y++) {
        let a = -1, b = -1; const row = y * W;
        for (let x = 0; x < W; x++) if (d[(row + x) * 4 + 3] > 100) { if (a < 0) a = x; b = x; }
        if (a < 0) continue;
        const cx = (a + b) / 2, hw = Math.max(1, (b - a) / 2);
        for (let x = a; x <= b; x++) {
          const i = row + x; if (!d[i * 4 + 3]) continue;
          const s = clamp(Math.sqrt(P.lum[i] / (ref || 1)), 0.8, 1.15);       // broad light from the photo
          const t = Math.abs(x - cx) / hw, round = 1 - 0.22 * t * t * t;      // fabric curving round the body
          const k = (1 + opts.light * (s - 1)) * (1 - opts.light * (1 - round));
          d[i * 4] = clamp(d[i * 4] * k, 0, 255); d[i * 4 + 1] = clamp(d[i * 4 + 1] * k, 0, 255); d[i * 4 + 2] = clamp(d[i * 4 + 2] * k, 0, 255);
        }
      }
    }
    lx.putImageData(im, 0, 0);
    const sw = P.geom ? P.geom.sw : W * 0.3;
    if (opts.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = sw * 0.07; ctx.shadowOffsetY = sw * 0.02; ctx.drawImage(L, 0, 0); ctx.restore(); }
    else ctx.drawImage(L, 0, 0);
    // arms and hair back on top
    if ((opts.arms && P.armMask) || (opts.hair && P.hairMask)) {
      const O = document.createElement('canvas'); O.width = W; O.height = H; const ox = O.getContext('2d'); ox.drawImage(P.canvas, 0, 0);
      const oi = ox.getImageData(0, 0, W, H), od = oi.data, gd = d;
      for (let i = 0; i < W * H; i++) {
        if (!gd[i * 4 + 3]) { od[i * 4 + 3] = 0; continue; }
        const m = Math.max(opts.arms && P.armMask ? P.armMask[i] : 0, opts.hair && P.hairMask ? P.hairMask[i] : 0);
        od[i * 4 + 3] = Math.round(255 * clamp(m * 1.15, 0, 1));
      }
      ox.putImageData(oi, 0, 0); ctx.drawImage(O, 0, 0);
    }
  }

  /* silhouette (vector) → garment image */
  function silhouetteCanvas(pathD, color) {
    const k = 3, c = document.createElement('canvas'); c.width = 200 * k; c.height = 320 * k; const x = c.getContext('2d');
    x.scale(k, k); const p = new Path2D(pathD); x.fillStyle = color; x.fill(p, 'nonzero');
    // details cut into the silhouette (belts, seams) become darker fabric, not holes
    const hc = document.createElement('canvas'); hc.width = c.width; hc.height = c.height; const hx = hc.getContext('2d'); hx.scale(k, k);
    hx.fillStyle = 'rgba(0,0,0,.32)'; hx.fill(p, 'nonzero'); hx.globalCompositeOperation = 'destination-out'; hx.fill(p, 'evenodd');
    const g = x.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(.3, 'rgba(255,255,255,.08)'); g.addColorStop(.55, 'rgba(0,0,0,.06)'); g.addColorStop(.8, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.24)');
    x.fillStyle = g; x.fill(p, 'nonzero'); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(hc, 0, 0); return c;
  }
  function silhouetteGarment(pathD, color, type) {
    const c = silhouetteCanvas(pathD, color), t = trim(c), g = t.c, w = g.width, h = g.height, ext = rowExtents(alphaOf(g), w, h);
    const r = Math.round(h * 0.035); const e = ext[r] || ext.find(Boolean);
    return { canvas: g, type: type || 'dress', worn: false, O: V((e[0] + e[1]) / 2, r), ex: V(1, 0), ey: V(0, 1), gw: e[1] - e[0] + 1, ext, note: '' };
  }

  window.HatilleTryOn = { CFG, loadPose, loadSeg, analysePerson, prepareGarment, silhouetteGarment, fit, render };
})();
