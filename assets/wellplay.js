/* Hatille wellness: interactive rituals, breathing guide, kindness cards and the Swatch Match game.
   Everything stays in the visitor's browser. */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const today = new Date().toDateString(), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- gold confetti ---------- */
  const cv = $('#confetti'), cx = cv.getContext('2d');
  function confetti(n) {
    if (reduce) return; cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#b08d57', '#d4b47e', '#f3e7cf', '#0c0b0a', '#ffffff'];
    const ps = Array.from({ length: n || 140 }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, s: (Math.random() - .5) * .3 }));
    let t = 0; (function f() { cx.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.vy += .32; p.x += p.vx; p.y += p.vy; p.a += p.s; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore(); }); if (++t < 150) requestAnimationFrame(f); else cx.clearRect(0, 0, cv.width, cv.height); })();
  }

  /* ---------- soft chime ---------- */
  let ac = null, soundOn = store.get('hatille-sound', true);
  function chime(f, d) {
    if (!soundOn) return; try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f || 660;
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (d || 0.9));
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.9));
    } catch (e) {}
  }

  /* ---------- rituals checklist ---------- */
  let rs = store.get('hatille-rituals', { d: today, done: [], streak: 0, last: null });
  if (rs.d !== today) { const y = new Date(Date.now() - 864e5).toDateString(); if (rs.last !== y && rs.last !== today) rs.streak = 0; rs = { d: today, done: [], streak: rs.streak, last: rs.last }; }
  function paintRituals() {
    $$('#rituals button').forEach(b => { const on = rs.done.includes(+b.dataset.r); b.classList.toggle('done', on); b.setAttribute('aria-pressed', on); b.querySelector('.tap').textContent = on ? 'Done today ✓' : 'Tap when done'; });
    const n = rs.done.length; $('#rtext').textContent = n === 5 ? 'All 5 today. You glow!' : `${n} of 5 today`; $('#rbar').style.width = (n / 5 * 100) + '%';
    $('#rstreak').textContent = rs.streak > 1 ? `${rs.streak}-day streak` : '';
  }
  $('#rituals').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.r, had = rs.done.length;
    rs.done = rs.done.includes(i) ? rs.done.filter(x => x !== i) : rs.done.concat(i);
    if (rs.done.length === 5 && had === 4) { if (rs.last !== today) { rs.streak = (rs.streak || 0) + 1; rs.last = today; } confetti(); chime(880, 1.2); }
    else if (rs.done.length > had) chime(660, .5);
    store.set('hatille-rituals', rs); paintRituals();
  });
  paintRituals();

  /* ---------- breathe with me ---------- */
  let btimer = null;
  function stopBreath(msg) { clearTimeout(btimer); btimer = null; $('#ball').style.transitionDuration = '1s'; $('#ball').style.transform = 'scale(1)'; $('#cue').textContent = 'Ready'; $('#bstart').classList.remove('hidden'); $('#bstop').classList.add('hidden'); if (msg) $('#bmsg').textContent = msg; }
  $('#bstart').onclick = () => {
    $('#bstart').classList.add('hidden'); $('#bstop').classList.remove('hidden');
    const steps = [['Breathe in', 4, 2.2], ['Hold', 4, 2.2], ['Breathe out', 6, 1]]; let i = 0, round = 0; const rounds = 4;
    (function next() {
      const [cue, sec, sc] = steps[i]; $('#cue').textContent = cue; $('#ball').style.transitionDuration = sec + 's'; $('#ball').style.transform = `scale(${sc})`;
      $('#bmsg').textContent = `Round ${round + 1} of ${rounds} · ${cue.toLowerCase()} for ${sec}`; if (i === 0) chime(523, .6);
      btimer = setTimeout(() => { i = (i + 1) % 3; if (i === 0) round++; if (round >= rounds) { stopBreath('Well done. Notice how you feel now.'); chime(784, 1.4); return; } next(); }, sec * 1000);
    })();
  };
  $('#bstop').onclick = () => stopBreath('Come back any time.');

  /* ---------- kindness cards ---------- */
  const AFF = [
    'You are allowed to take up space.', 'Rest is part of the work, not a reward for it.', 'You don\'t have to earn your softness.',
    'Small steps still move you forward.', 'Your worth is not measured by today\'s to-do list.', 'Dress for the person you are becoming.',
    'You are not behind. You are on your own path.', 'Rome was not built in a day, and neither are you.', 'The right colours exist for you. So does the right fit.',
    'Be as patient with yourself as you are with others.', 'Today, choose one thing that feels like care.', 'You can begin again at any moment.',
    'Confidence is a habit, and you are building it.', 'What you wear can be a kind message to yourself.', 'You deserve the special piece on an ordinary Tuesday.',
  ];
  let ai = -1;
  function draw() {
    const d = $('#deck'); let n; do { n = Math.random() * AFF.length | 0; } while (n === ai && AFF.length > 1); ai = n;
    if (d.classList.contains('flip')) { d.classList.remove('flip'); setTimeout(() => { $('#aff').textContent = AFF[ai]; d.classList.add('flip'); chime(698, .6); }, reduce ? 0 : 450); }
    else { $('#aff').textContent = AFF[ai]; d.classList.add('flip'); chime(698, .6); }
  }
  $('#deck').onclick = draw; $('#deck').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); draw(); } };
  $('#draw').onclick = draw;
  $('#shareAff').onclick = () => {
    if (ai < 0) draw(); const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#fffdf8'); g.addColorStop(1, '#f0e4cf'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    x.strokeStyle = '#b08d57'; x.lineWidth = 3; x.strokeRect(60, 60, 960, 1230);
    x.fillStyle = '#2a251f'; x.textAlign = 'center'; x.font = 'italic 64px Lora, Georgia, serif';
    const words = AFF[ai].split(' '), lines = []; let line = '';
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > 820) { lines.push(line); line = w; } else line = t; }); lines.push(line);
    lines.forEach((l, i) => x.fillText(l, 540, 640 - (lines.length - 1) * 44 + i * 88));
    x.fillStyle = '#b08d57'; x.font = '300 34px Poppins, sans-serif'; x.fillText('H A T I L L E', 540, 1180); x.font = '300 24px Poppins, sans-serif'; x.fillText('hatille.com', 540, 1225);
    const a = document.createElement('a'); a.download = 'hatille-kind-words.jpg'; a.href = c.toDataURL('image/jpeg', .92); a.click();
  };

  /* ---------- Swatch Match ---------- */
  const FABRICS = [
    { n: 'Silk', bg: 'linear-gradient(135deg,#7b1e1e 0%,#b23a3a 45%,#e07a7a 52%,#8f2626 60%,#6a1717 100%)', w: 'Silk: you can be soft and strong at the same time.' },
    { n: 'Linen', bg: 'repeating-linear-gradient(0deg,rgba(255,255,255,.18) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 1px,transparent 1px 4px),#d9cbb2', w: 'Linen: wrinkles are proof you lived today.' },
    { n: 'Velvet', bg: 'radial-gradient(circle at 30% 25%,#5e4b8b 0%,#2e2150 55%,#1b1233 100%)', w: 'Velvet: your depth is beautiful.' },
    { n: 'Denim', bg: 'repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 2px,transparent 2px 6px),linear-gradient(#2c4a73,#1f3554)', w: 'Denim: you get better with every wear.' },
    { n: 'Gold lamé', bg: 'linear-gradient(120deg,#8a6a32,#e9cf8f 30%,#b08d57 50%,#f6e2b0 65%,#8a6a32)', w: 'Gold: you were made to shine.' },
    { n: 'Gingham', bg: 'repeating-linear-gradient(0deg,rgba(47,93,80,.45) 0 10px,transparent 10px 20px),repeating-linear-gradient(90deg,rgba(47,93,80,.45) 0 10px,transparent 10px 20px),#f4f1ea', w: 'Gingham: simple joys are still joys.' },
    { n: 'Cashmere', bg: 'radial-gradient(circle at 70% 30%,#f3e1d3,#e1c2ae 60%,#cfa992)', w: 'Cashmere: wrap yourself in kindness today.' },
    { n: 'Lace', bg: 'radial-gradient(circle,rgba(255,255,255,.9) 2px,transparent 3px) 0 0/14px 14px,radial-gradient(circle,rgba(255,255,255,.55) 5px,transparent 6px) 7px 7px/14px 14px,#efe6d6', w: 'Lace: the delicate parts of you are part of your strength.' },
  ];
  let level = 6, cards = [], open = [], moves = 0, pairs = 0, lock = false;
  const best = () => store.get('hatille-swatch-best-' + level, null);
  function newGame() {
    const pick = FABRICS.slice().sort(() => Math.random() - .5).slice(0, level);
    cards = pick.concat(pick).map((f, i) => ({ f, id: i })).sort(() => Math.random() - .5);
    open = []; moves = 0; pairs = 0; lock = false; $('#win').classList.remove('on');
    $('#board').querySelectorAll('.sw-card').forEach(c => c.remove());
    $('#board').insertAdjacentHTML('afterbegin', cards.map((c, i) => `<button class="sw-card" data-i="${i}" aria-label="Swatch ${i + 1}, face down"><span class="in"><span class="f"><span class="mono">H</span></span><span class="b" style="background:${c.f.bg}"><span>${c.f.n}</span></span></span></button>`).join(''));
    stats(); $('#toast').textContent = 'Tap any swatch to begin.';
  }
  function stats() { $('#gm').textContent = moves; $('#gp').textContent = `${pairs}/${level}`; const b = best(); $('#gb').textContent = b ? b : '–'; }
  $('#board').addEventListener('click', e => {
    const el = e.target.closest('.sw-card'); if (!el || lock || el.classList.contains('up') || el.classList.contains('got')) return;
    const i = +el.dataset.i; el.classList.add('up'); el.setAttribute('aria-label', cards[i].f.n); open.push(i); chime(440 + open.length * 110, .25);
    if (open.length < 2) return;
    moves++; const [a, b] = open, A = $(`.sw-card[data-i="${a}"]`), B = $(`.sw-card[data-i="${b}"]`);
    if (cards[a].f.n === cards[b].f.n) {
      A.classList.add('got'); B.classList.add('got'); pairs++; open = []; $('#toast').textContent = cards[a].f.w; chime(880, .8);
      if (pairs === level) {
        const b0 = best(); if (!b0 || moves < b0) store.set('hatille-swatch-best-' + level, moves);
        setTimeout(() => {
          $('#wtitle').textContent = moves <= level + 2 ? 'Wow, a perfect memory!' : 'Beautifully done.';
          $('#wtext').textContent = `You matched every swatch in ${moves} moves${!b0 || moves < b0 ? ', your new best' : ''}. Take that calm into the rest of your day.`;
          $('#win').classList.add('on'); confetti(); chime(1046, 1.4);
        }, 650);
      }
    } else {
      lock = true; $('#toast').textContent = 'Not a pair. Breathe, and try again.';
      setTimeout(() => { A.classList.remove('up'); B.classList.remove('up'); A.setAttribute('aria-label', 'Swatch face down'); B.setAttribute('aria-label', 'Swatch face down'); open = []; lock = false; }, 900);
    }
    stats();
  });
  $('#level').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; level = +b.dataset.n; $$('#level button').forEach(x => x.classList.toggle('on', x === b)); newGame(); });
  $('#restart').onclick = newGame; $('#again').onclick = newGame;
  const paintSound = () => { $('#sound').textContent = 'Sound: ' + (soundOn ? 'on' : 'off'); $('#sound').setAttribute('aria-pressed', soundOn); };
  $('#sound').onclick = () => { soundOn = !soundOn; store.set('hatille-sound', soundOn); paintSound(); };
  paintSound(); newGame();
})();
