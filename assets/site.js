/* Staff invite / password-reset links land on the home page: send them to the staff login */
if (/(invite|recovery|confirmation|email_change)_token=/.test(location.hash) && !location.pathname.startsWith('/admin')) location.replace('/admin/' + location.hash);
/* Hatille shared header, footer and helpers */
const HATILLE = {
  email: 'info.hatille@gmail.com',
  // Update these to your real profile links
  socials: {
    Instagram: 'https://www.instagram.com/hatillehilton/',
    Facebook: 'https://www.facebook.com/hatillehilton/',
    LinkedIn: 'https://www.linkedin.com/company/hatill%C3%A9/home/',
    YouTube: 'https://www.youtube.com/@Hatille',
  },
  // Paste your Cal.com booking links here once your account is set up, e.g. 'https://cal.com/hatille/30min'
  booking: { free: 'https://cal.com/hatille/discovery', s30: 'https://cal.com/hatille/consultation', s60: 'https://cal.com/hatille/full-session' },
  // Digital downloads. Paste each Stripe Payment Link in 'link'. In Stripe, set "After payment" to redirect to:
  //   https://hatille.com/download?item=KEY&session_id={CHECKOUT_SESSION_ID}   (KEY = palette, swatch, planner, block or blockset)
  products: {
    palette: { name: 'Personal Colour Palette Guide', price: 15, link: 'https://buy.stripe.com/28EeVf0D3g7179K5p1ds400' },
    swatch: { name: 'Swatch Card & Fan', price: 10, link: 'https://buy.stripe.com/9B600lbhH2gb3Xy5p1ds401' },
    planner: { name: "Bride's Alteration & Wedding Planner", price: 20, link: 'https://buy.stripe.com/fZuaEZ99z1c7bq0aJlds402' },
    block: { name: 'Pattern block download', price: 5, link: 'https://buy.stripe.com/00w14petTaMH79KaJlds403' },
    blockset: { name: 'Pattern Block Full Set', price: 25, link: 'https://buy.stripe.com/9B66oJgC1bQLcu4g3Fds404' },
  },
  nav: [
    ['Home', '/'], ['About', '/about'], ['Colour Analysis', '/colour-analysis'],
    ['Wellness', '/wellness'], ['Shop', '/shop'], ['Alterations', '/alterations'],
    ['Blog', '/blog'], ['Contact', '/contact'], ['Book', '/book'],
  ],
};

(function () {
  let here = (location.pathname.split('/').pop() || 'index').toLowerCase().replace(/\.html$/, '');
  if (/^\/blog\//.test(location.pathname)) here = 'blog';
  if (here === '') here = 'index';
  const header = document.createElement('header');
  header.className = 'site-header no-print';
  header.innerHTML = `
    <nav class="nav" aria-label="Main">
      <a class="logo" href="/" aria-label="Hatille home"><img src="/assets/img/hatille-wordmark-gold.svg" alt="Hatille"></a>
      <button class="menu-btn" aria-expanded="false" aria-controls="menu">Menu</button>
      <ul id="menu">${HATILLE.nav.map(([t, h]) => `<li><a href="${h}"${h.replace(/^\//, '') === here || (h === '/' && here === 'index') ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul>
    </nav>`;
  document.body.prepend(header);
  const btn = header.querySelector('.menu-btn'), ul = header.querySelector('ul');
  btn.addEventListener('click', () => { const o = ul.classList.toggle('open'); btn.setAttribute('aria-expanded', o); btn.textContent = o ? 'Close' : 'Menu'; });

  const footer = document.createElement('footer');
  footer.className = 'site-footer no-print';
  footer.innerHTML = `
    <div class="wrap">
      <div class="cols">
        <div><img src="/assets/img/hatille-wordmark-gold.svg" alt="Hatille" style="height:26px;margin-bottom:24px">
          <p style="max-width:340px;font-size:14px">Fashion · Health · Wellness. Style is how you take care of yourself, made visible.</p>
          <p style="font-size:14px">Toronto, Ontario, Canada</p></div>
        <div><h4>Explore</h4>${HATILLE.nav.slice(0, 4).map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div>
        <div><h4>Services</h4>${HATILLE.nav.slice(4).map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</div>
        <div><h4>Follow</h4>${Object.entries(HATILLE.socials).map(([t, h]) => `<a href="${h}" target="_blank" rel="noopener">${t}</a>`).join('')}
          <h4 style="margin-top:26px">Contact</h4><a href="mailto:${HATILLE.email}">${HATILLE.email}</a></div>
      </div>
      <div class="base"><span>© ${new Date().getFullYear()} Hatille. All rights reserved.</span><span>Hatille Handmade Bridal · Coming soon</span></div>
    </div>`;
  document.body.append(footer);
})();

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 3600);
}

/* Forms: posts to Netlify Forms when the site is hosted on Netlify; otherwise shows the email fallback. */
async function submitForm(form, okHtml) {
  const data = new URLSearchParams(new FormData(form));
  const out = form.querySelector('.form-out');
  try {
    const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() });
    if (!r.ok) throw new Error(r.status);
    out.innerHTML = okHtml;
    form.querySelectorAll('input,textarea,select,button').forEach(el => el.disabled = true);
  } catch (e) {
    const subject = encodeURIComponent(form.dataset.subject || 'Hatille website');
    const body = encodeURIComponent([...new FormData(form).entries()].filter(([k]) => k !== 'form-name' && k !== 'bot-field').map(([k, v]) => `${k}: ${v}`).join('\n'));
    out.innerHTML = `<p class="note" style="margin-top:16px">Online sending isn't switched on yet. Please email us at <strong>${HATILLE.email}</strong>.
      <a class="link" style="margin-left:8px" href="mailto:${HATILLE.email}?subject=${subject}&body=${body}">Open email</a></p>`;
  }
}
const FORM_TEXT = {
  waitlist: { subject: 'Hatille waitlist', ok: 'You are on the list. We will email you before launch.' },
  contact: { subject: 'Hatille website enquiry', ok: 'Thank you. Your message has been sent and I will reply soon.' },
};
document.addEventListener('submit', e => {
  const f = e.target;
  if (!f.querySelector('input[name="form-name"]')) return;
  e.preventDefault();
  const t = FORM_TEXT[f.getAttribute('name')] || { subject: 'Hatille website', ok: 'Thank you. We will be in touch soon.' };
  f.dataset.subject = t.subject;
  submitForm(f, '<p class="form-ok" style="margin-top:18px;font-size:16px">' + t.ok + '</p>');
});

/* Fallback: if a form was posted without JavaScript, show its thank-you message on return */
(function () {
  const q = new URLSearchParams(location.search);
  const name = q.has('sent') ? 'contact' : q.has('joined') ? 'waitlist' : null;
  if (!name) return;
  const f = document.querySelector('form[name="' + name + '"]');
  if (!f) return;
  const out = f.querySelector('.form-out') || f;
  out.insertAdjacentHTML('beforeend', '<p class="form-ok" style="margin-top:18px;font-size:16px">' + FORM_TEXT[name].ok + '</p>');
})();

/* Gentle reveal-on-scroll for a modern feel (skipped if the visitor prefers reduced motion) */
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const run = () => {
    const els = document.querySelectorAll('main section h2, main .ph-frame, main .plan, main .shop, main .pillars > *, main .bcard, main .tguide > div, main .fg, main .split > img');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rv-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el, i) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) return; el.classList.add('rv'); el.style.transitionDelay = ((i % 4) * 70) + 'ms'; io.observe(el); });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();


/* Purchases & pattern-block credits, kept in this browser */
window.HatilleShop = (function () {
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const validSid = s => /^cs_(live|test)_[A-Za-z0-9]{10,}$/.test(s || '');
  return {
    purchases: () => get('hatille-purchases', []),
    record(item, sid) { if (!validSid(sid)) return false; const p = get('hatille-purchases', []); if (!p.some(x => x.sid === sid)) { p.push({ item, sid, at: Date.now() }); set('hatille-purchases', p); } return true; },
    owns: item => get('hatille-purchases', []).some(x => x.item === item),
    blocks: () => get('hatille-blocks', {}),
    ownsBlock: key => !!get('hatille-blocks', {})[key],
    ownsSet: () => get('hatille-purchases', []).some(x => x.item === 'blockset'),
    freeUsed: () => Object.values(get('hatille-blocks', {})).some(v => v === 'free'),
    credits() { const used = Object.values(get('hatille-blocks', {})); return get('hatille-purchases', []).filter(x => x.item === 'block' && !used.includes(x.sid)); },
    grantBlock(key, how) { const b = get('hatille-blocks', {}); b[key] = how; set('hatille-blocks', b); },
    buy(item) {
      const p = HATILLE.products[item]; if (!p) return;
      if (p.link) { location.href = p.link; return; }
      location.href = 'mailto:' + HATILLE.email + '?subject=' + encodeURIComponent('Order: ' + p.name) + '&body=' + encodeURIComponent('Hi Hatille, I would like to buy the ' + p.name + ' ($' + p.price + ' CAD).');
    },
    get, set, validSid,
  };
})();
