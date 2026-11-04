/* Hatille alteration finder: smart search, location-based shops, map, and a separate bridal section.
   Location stays in the visitor's browser. Place names and nearby tailors come from OpenStreetMap
   (Nominatim search), at most one request per second. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const fmtKm = d => d < 1 ? `${Math.round(d * 1000)} m` : d < 20 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
  const gmaps = (term, L) => L ? `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${L.lat.toFixed(4)},${L.lng.toFixed(4)},13z` : mapsLink(term + ' near me');
  const DEFAULT = { lat: 43.6532, lng: -79.3832, label: 'Toronto', isDefault: true };
  const CITY_CENTRES = [['Toronto & GTA', 43.70, -79.40], ['Mississauga · Brampton · Etobicoke', 43.62, -79.65], ['Hamilton · Burlington', 43.28, -79.84], ['Guelph · Kitchener-Waterloo', 43.47, -80.40], ['Ottawa', 45.40, -75.70], ['London', 42.98, -81.25]];

  let cat = 'everyday', L = store.get('hatille-loc') || null, current = null, map = null, layer = null, osmCache = {};

  /* ---------- categories & quick picks ---------- */
  const QUICK = {
    everyday: ['Hem trousers', 'Shorten a dress', 'Take in a dress', 'Let out', 'Suit jacket', 'Shorten sleeves', 'Zipper', 'Repair a tear', 'Waist gap'],
    bridal: ['Wedding dress hem', 'Bustle', 'Wedding bodice', 'Add sleeves', 'Bra cups', 'Bridesmaid dress'],
  };
  function setCat(c) {
    cat = c; document.querySelectorAll('#cats button').forEach(b => b.classList.toggle('on', b.dataset.c === c));
    $('#quick').innerHTML = QUICK[c].map(q => `<button class="chip" type="button">${q}</button>`).join('');
    $('#q').placeholder = c === 'bridal' ? 'Start typing: hem, bustle, bodice, sleeves…' : 'Start typing: hem, too big, zipper, sleeves…';
  }
  $('#cats').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setCat(b.dataset.c); });
  $('#quick').addEventListener('click', e => { if (e.target.matches('.chip')) { $('#q').value = e.target.textContent; closeSugg(); run(); } });

  /* ---------- smart matching + suggestions ---------- */
  const SYN = { long: 'too long', short: 'shorten', big: 'too big', loose: 'too big', baggy: 'too big', small: 'too tight', tight: 'too tight', pant: 'pants', trouser: 'trousers', gown: 'gown', marry: 'wedding', marriage: 'wedding', bride: 'bridal', broke: 'broken zip', ripped: 'rip', torn: 'tear', hole: 'hole', fix: 'repair' };
  function score(a, text) {
    const t = ' ' + text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ') + ' ';
    const words = t.trim().split(/\s+/).map(w => SYN[w] || w).join(' ');
    const bridalHint = /(wedding|bridal|bride|gown|veil|bustle|train)/.test(t) || cat === 'bridal';
    let s = 0;
    for (const k of a.kw) { if (t.includes(k) || words.includes(k)) s += k.split(' ').length * 2 + k.length / 10; else if (k.length > 3 && words.split(' ').some(w => w.length > 2 && k.startsWith(w))) s += 0.8; }
    if (a.title.toLowerCase().includes(text.toLowerCase().trim()) && text.trim().length > 2) s += 4;
    if (a.bridal && bridalHint) s += 3; if (!a.bridal && bridalHint) s -= 2; if (a.bridal && !bridalHint) s -= 1.5;
    return s;
  }
  function ranked(text) { return ALTERATIONS.map(a => ({ a, s: score(a, text) })).filter(x => x.s > 0.5).sort((x, y) => y.s - x.s); }
  function match(text) { const r = ranked(text); if (r.length) return r[0].a; if (/(wedding|bridal|bride|gown)/i.test(text) || cat === 'bridal') return ALTERATIONS.find(a => a.id === 'bridal-bodice'); return null; }

  let act = -1;
  function closeSugg() { $('#sugg').classList.remove('on'); $('#q').setAttribute('aria-expanded', 'false'); act = -1; }
  function showSugg() {
    const text = $('#q').value.trim();
    const list = (text.length < 2 ? ALTERATIONS.filter(a => a.bridal === (cat === 'bridal')).map(a => ({ a })) : ranked(text)).slice(0, 7);
    if (!list.length) return closeSugg();
    $('#sugg').innerHTML = list.map(({ a }, i) => `<button type="button" role="option" data-id="${a.id}" class="${i === act ? 'act' : ''}"><span>${a.title}</span><small>$${a.cost[0]}–$${a.cost[1]}${a.bridal ? ' · bridal' : ''}</small></button>`).join('');
    $('#sugg').classList.add('on'); $('#q').setAttribute('aria-expanded', 'true');
  }
  $('#q').addEventListener('input', () => { act = -1; showSugg(); });
  $('#q').addEventListener('focus', showSugg);
  $('#q').addEventListener('keydown', e => {
    const items = [...$('#sugg').querySelectorAll('button')];
    if (e.key === 'ArrowDown' && items.length) { act = Math.min(items.length - 1, act + 1); items.forEach((b, i) => b.classList.toggle('act', i === act)); e.preventDefault(); }
    else if (e.key === 'ArrowUp' && items.length) { act = Math.max(0, act - 1); items.forEach((b, i) => b.classList.toggle('act', i === act)); e.preventDefault(); }
    else if (e.key === 'Enter') { if (act > -1 && items[act]) pick(items[act].dataset.id); else { closeSugg(); run(); } e.preventDefault(); }
    else if (e.key === 'Escape') closeSugg();
  });
  $('#sugg').addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); pick(b.dataset.id); } });
  document.addEventListener('click', e => { if (!e.target.closest('.qwrap')) closeSugg(); });
  function pick(id) { const a = ALTERATIONS.find(x => x.id === id); $('#q').value = a.title; closeSugg(); show(a); }
  $('#go').addEventListener('click', () => { closeSugg(); run(); });

  function run() {
    const text = $('#q').value.trim(), out = $('#out');
    if (!text) { out.innerHTML = '<p class="note">Type what you need altered, or tap one of the options above.</p>'; return; }
    const a = match(text);
    if (!a) {
      out.innerHTML = `<div class="panel"><h3>We'll help you find the right person</h3><p class="muted" style="margin-top:12px">We don't have a guide for that one yet. Describe it to a tailor in three parts: what's wrong ("it's loose at the back"), how you want it to feel, and when you need it. The tailors below can quote it for you.</p></div>`;
      return;
    }
    show(a);
  }
  function show(a) {
    current = a; if (a.bridal && cat !== 'bridal') setCat('bridal');
    $('#out').innerHTML = `
    <div class="answer">
      <div>
        <span class="tag">${a.bridal ? 'Bridal alteration' : 'Alteration guide'}</span>
        <h2 style="margin-top:20px;font-size:clamp(30px,3.4vw,46px)">${a.title}</h2>
        <div class="eyebrow" style="margin-top:34px">What to say to your tailor</div>
        <p class="say">${a.say}</p>
        <div class="eyebrow">How it's done</div>
        <p style="margin-top:12px">${a.how}</p>
        <div class="eyebrow" style="margin-top:26px">Hatille tips</div>
        <ul class="tips" style="margin-top:12px;padding-left:18px">${a.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
      <div class="side gridlines">
        <div class="eyebrow">At a glance</div>
        <div style="margin-top:20px">
          <div class="kv"><span>Average cost (Ontario)</span><b>$${a.cost[0]}–$${a.cost[1]}</b></div>
          <div class="kv"><span>Typical turnaround</span><b>${a.time}</b></div>
          <div class="kv"><span>Difficulty</span><b>${a.level}</b></div>
        </div>
        <p class="note" style="margin-top:20px">Cost is an estimate in Canadian dollars. Prices vary with fabric, lining, beading and the shop, so always ask for a quote at your fitting.</p>
        <a class="btn" style="margin-top:26px" href="${a.bridal ? '#bridalSec' : '#shopsSec'}">${a.bridal ? 'See bridal specialists near you' : 'See tailors near you'}</a>
      </div>
    </div>`;
    $('#out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- location ---------- */
  const stat = t => $('#locStat').textContent = t || '';
  function setLoc(l, why) {
    L = l; store.set('hatille-loc', l); $('#loc').value = l.label || '';
    stat(why || `Showing places near ${l.label}.`);
    const near = CITY_CENTRES.map(c => ({ c: c[0], d: km(l, { lat: c[1], lng: c[2] }) })).sort((a, b) => a.d - b.d)[0];
    const city = near && near.d < 70 ? near.c : 'Elsewhere in Ontario';
    const pc = $('#pcity'); if (pc && [...pc.options].some(o => o.value === city)) { pc.value = city; pc.dispatchEvent(new Event('change')); }
    renderAll();
  }
  async function reverse(lat, lng) {
    try { const j = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } }).then(r => r.json()); const a = j.address || {}; return [a.suburb || a.neighbourhood || a.city_district || a.town || a.village, a.city || a.town || a.county].filter(Boolean).filter((v, i, x) => x.indexOf(v) === i).join(', ') || 'your location'; }
    catch (e) { return 'your location'; }
  }
  $('#useLoc').addEventListener('click', () => {
    if (!navigator.geolocation) { stat('Your browser can\'t share location. Type your city or postal code instead.'); return; }
    stat('Finding you…');
    navigator.geolocation.getCurrentPosition(async p => {
      const lat = p.coords.latitude, lng = p.coords.longitude; stat('Found you. Looking up your area…');
      setLoc({ lat, lng, label: await reverse(lat, lng) });
    }, () => stat('Location was not shared. Type your city or postal code instead.'), { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  });
  async function geocode() {
    const q = $('#loc').value.trim(); if (!q) return;
    stat('Looking up ' + q + '…');
    try {
      const j = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } }).then(r => r.json());
      if (!j.length) { stat(`We couldn't find "${q}". Try a city, neighbourhood or postal code.`); return; }
      const a = j[0].address || {}; const label = [a.suburb || a.neighbourhood || a.city_district || a.town || a.village, a.city || a.town || a.state].filter(Boolean).filter((v, i, x) => x.indexOf(v) === i).join(', ') || q;
      setLoc({ lat: +j[0].lat, lng: +j[0].lon, label });
    } catch (e) { stat('Location lookup is unavailable right now. Showing Toronto.'); }
  }
  $('#loc').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); geocode(); } });
  $('#loc').addEventListener('change', geocode);

  /* ---------- nearby tailors from OpenStreetMap ---------- */
  async function osmNearby(l) {
    const key = l.lat.toFixed(2) + ',' + l.lng.toFixed(2); if (osmCache[key]) return osmCache[key];
    const d = 0.13, vb = `${l.lng - d * 1.4},${l.lat + d},${l.lng + d * 1.4},${l.lat - d}`; // about 15 km around you
    const OK = /^(tailor|dry_cleaning|clothes|dressmaker|sewing|boutique|fabric|craft|wedding)$/;
    const seen = new Set(), list = []; let failed = 0;
    for (const term of ['tailor', 'alterations', 'bridal']) {
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
        const j = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=40&bounded=1&addressdetails=1&viewbox=${vb}&q=${term}`, { signal: ctl.signal, headers: { 'Accept-Language': 'en' } }).then(r => r.json());
        clearTimeout(to);
        for (const e of j) {
          if (!e.name || !OK.test(e.type)) continue;
          if (term === 'bridal' && !/bridal|bride|wedding|gown/i.test(e.name)) continue;
          const k = e.name.toLowerCase(); if (seen.has(k) || SHOPS.some(s => s.name.toLowerCase() === k)) continue; seen.add(k);
          const a = e.address || {}; const addr = [a.house_number, a.road].filter(Boolean).join(' ') || a.suburb || a.city || '';
          list.push({ name: e.name, lat: +e.lat, lng: +e.lon, addr, bridal: term === 'bridal' || /bridal|bride|wedding|gown/i.test(e.name) });
        }
      } catch (e) { failed++; }
      await new Promise(r => setTimeout(r, 1100)); // be polite to the free service: one request per second
    }
    if (failed === 3) return null;
    return (osmCache[key] = list);
  }

  /* ---------- map ---------- */
  const Lf = window.L;
  function ensureMap() {
    if (map || !Lf) return; map = Lf.map('map', { scrollWheelZoom: false, zoomControl: true });
    Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    layer = Lf.layerGroup().addTo(map);
  }
  const icon = cls => Lf.divIcon({ className: '', html: `<div class="pin ${cls}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
  function drawMap(l, curated, osm) {
    ensureMap(); if (!map) return; layer.clearLayers(); const pts = [[l.lat, l.lng]];
    Lf.marker([l.lat, l.lng], { icon: icon('me'), title: 'You' }).addTo(layer).bindPopup(l.isDefault ? 'Toronto (share your location for results near you)' : 'You are here');
    curated.forEach(s => { Lf.marker([s.lat, s.lng], { icon: icon(s.types.includes('bridal') && !s.types.includes('general') ? 'bridal' : '') }).addTo(layer).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.area)}<br><a href="${mapsLink(s.name + ' ' + s.area)}" target="_blank" rel="noopener">Directions</a>`); if (s.d < 40) pts.push([s.lat, s.lng]); });
    (osm || []).slice(0, 25).forEach(s => { Lf.marker([s.lat, s.lng], { icon: icon('osm') }).addTo(layer).bindPopup(`<b>${esc(s.name)}</b>${s.addr ? '<br>' + esc(s.addr) : ''}<br><a href="${mapsLink(s.name + ' ' + (s.addr || ''))}" target="_blank" rel="noopener">Directions & reviews</a>`); pts.push([s.lat, s.lng]); });
    if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 }); else map.setView([l.lat, l.lng], 12);
  }

  /* ---------- lists ---------- */
  const shopCard = (s, i, L) => `
    <div class="shop ${i === 0 ? 'top corner' : ''}">
      <span class="rank">${String(i + 1).padStart(2, '0')}</span>
      <span class="tag">${s.pinned ? 'Hatille #1 pick' : esc(s.city)}</span>${s.d != null && !L.isDefault ? `<span class="dist">${s.approx ? 'about ' + Math.max(1, Math.round(s.d)) + ' km' : fmtKm(s.d)}</span>` : ''}
      <h4>${esc(s.name)}</h4>
      <div class="area">${esc(s.area)}${s.phone ? ' · <a href="tel:' + s.phone.replace(/\D/g, '') + '">' + s.phone + '</a>' : ''}${s.serves ? ' · ' + esc(s.serves) : ''}</div>
      <p class="muted" style="font-size:14px;margin:0">${esc(s.note)}</p>
      <div class="cred">${esc(s.cred)}</div>
      <a class="link" href="${mapsLink(s.name + ' ' + s.area + ' Ontario')}" target="_blank" rel="noopener">Directions & reviews</a>${s.url ? ` <a class="link" href="${s.url}" target="_blank" rel="noopener" style="margin-left:16px">Website</a>` : ''}
    </div>`;
  const moreCard = (term, L, what) => `
    <div class="shop" style="background:transparent;border-style:dashed">
      <span class="tag">More near you</span>
      <h4>Every ${what} near ${esc(L.label)}</h4>
      <p class="muted" style="font-size:14px">See all ${what}s around you on Google Maps with ratings and reviews.</p>
      <a class="link" href="${gmaps(term, L)}" target="_blank" rel="noopener">Open map</a>
    </div>`;
  const osmCards = list => list.map(s => `<div><b>${esc(s.name)}</b><span>${s.addr ? esc(s.addr) + ' · ' : ''}${fmtKm(s.d)}</span><br><a class="link" style="font-size:12px" href="${mapsLink(s.name + ' ' + (s.addr || ''))}" target="_blank" rel="noopener">Directions & reviews</a></div>`).join('');

  async function renderAll() {
    const l = L || DEFAULT, inOntario = l.lat > 41.6 && l.lat < 57 && l.lng > -95.2 && l.lng < -74.3;
    const withD = SHOPS.filter(s => s.lat).map(s => Object.assign({}, s, { d: km(l, s) }));
    const sortNear = arr => arr.sort((a, b) => (inOntario ? (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) : 0) || a.d - b.d);
    const general = sortNear(withD.filter(s => s.types.includes('general') && (s.d < 60 || s.pinned))).slice(0, 5);
    const bridal = sortNear(withD.filter(s => (BRIDAL_ELITE.includes(s.name) || s.types.includes('bridal')) && (s.d < 120 || s.pinned))).slice(0, 5);
    $('#shopsTitle').innerHTML = `Tailors near <em class="gold-d">${esc(l.label)}</em>`;
    $('#shopsSub').textContent = l.isDefault ? 'Showing Toronto. Share your location or type your city above to see places near you.' : inOntario ? 'Sorted by distance from you. Style & Grace Cleaners is our first recommendation across Ontario.' : 'Our hand-picked list covers Ontario. Use the map links to see top-rated tailors where you are.';
    $('#shops').innerHTML = (general.length ? general.map((s, i) => shopCard(s, i, l)).join('') : '') + moreCard('clothing alterations tailor', l, 'tailor');
    $('#bshops').innerHTML = (bridal.length ? bridal.map((s, i) => shopCard(s, i, l)).join('') : '') + moreCard('bridal alterations wedding dress', l, 'bridal seamstress');
    $('#bshopsSub').textContent = bridal.length ? 'Only studios with standout reviews, awards or expert recognition. Nearest first.' : 'We don\'t have hand-picked bridal studios near you yet. Use the map link for top-rated bridal seamstresses around you.';
    $('#osm').innerHTML = '<div><span>Finding tailors around you…</span></div>'; $('#bosm').innerHTML = '';
    drawMap(l, general.concat(bridal.filter(b => !general.includes(b))), []);
    const osm = await osmNearby(l);
    if (osm === null) { $('#osm').innerHTML = `<div><span>Couldn't load nearby tailors right now.</span><br><a class="link" style="font-size:12px" href="${gmaps('tailor alterations', l)}" target="_blank" rel="noopener">Open Google Maps</a></div>`; return; }
    osm.forEach(s => s.d = km(l, s)); osm.sort((a, b) => a.d - b.d);
    const og = osm.filter(s => !s.bridal).slice(0, 9), ob = osm.filter(s => s.bridal).slice(0, 6);
    $('#osm').innerHTML = og.length ? osmCards(og) : `<div><span>No other tailors listed on OpenStreetMap within about 15 km.</span></div>`;
    $('#bosm').innerHTML = ob.length ? osmCards(ob) : `<div><span>No other bridal shops listed nearby.</span></div>`;
    drawMap(l, general.concat(bridal.filter(b => !general.includes(b))), og.concat(ob));
  }

  /* ---------- bridal cards ---------- */
  $('#bcards').innerHTML = ALTERATIONS.filter(a => a.bridal).map(a => `<button class="bcard" type="button" data-id="${a.id}"><span class="c">$${a.cost[0]}–$${a.cost[1]} · ${a.time}</span><h4>${a.title}</h4><span class="muted" style="font-size:14px">${a.how.split('. ')[0]}.</span><span class="link" style="margin-top:6px;align-self:flex-start">Read the guide</span></button>`).join('');
  $('#bcards').addEventListener('click', e => { const b = e.target.closest('.bcard'); if (b) { const a = ALTERATIONS.find(x => x.id === b.dataset.id); $('#q').value = a.title; show(a); } });

  setCat(new URLSearchParams(location.search).get('type') === 'bridal' ? 'bridal' : 'everyday');
  if (L) { $('#loc').value = L.label; stat(`Showing places near ${L.label}.`); }
  renderAll();
})();
