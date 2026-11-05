// Navigation (mobile)
const nav = document.querySelector('.nav');
nav?.querySelector('.nav__toggle')?.addEventListener('click', (e) => {
  const open = nav.classList.toggle('is-open');
  e.currentTarget.setAttribute('aria-expanded', open);
});
nav?.querySelectorAll('.nav__sub-toggle').forEach((b) => b.addEventListener('click', () => {
  const open = b.parentElement.classList.toggle('sub-open');
  b.setAttribute('aria-expanded', open);
}));
const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Altersabfrage
const gate = document.getElementById('agegate');
if (gate && !document.documentElement.classList.contains('age-ok')) {
  gate.addEventListener('click', (e) => {
    const a = e.target.closest('[data-age]')?.dataset.age;
    if (a === 'yes') {
      try { localStorage.setItem('ageOk', '1'); } catch (_) {}
      document.documentElement.classList.add('age-ok');
    } else if (a === 'no') {
      gate.querySelector('.agegate__buttons').hidden = true;
      gate.querySelector('.agegate__denied').hidden = false;
    }
  });
}

// Bestellformular: Total berechnen
const chf = (n) => 'CHF ' + n.toFixed(2);
function orderSummary(form) {
  const lines = [];
  let total = 0, bottles = 0;
  form.querySelectorAll('input[data-wine]').forEach((i) => {
    const q = Math.max(0, parseInt(i.value, 10) || 0);
    if (!q) return;
    const p = parseFloat(i.dataset.price);
    total += q * p; bottles += q;
    lines.push(`${q} × ${i.dataset.wine} (${i.dataset.volume}) à ${chf(p)} = ${chf(q * p)}`);
  });
  // Porto: pro angefangenen 6er-Karton
  const boxes = Math.ceil(bottles / 6), missing = boxes * 6 - bottles;
  const shipping = boxes * (parseFloat(form.dataset.shipping) || 0);
  return { lines, total, bottles, boxes, missing, shipping, grand: total + shipping };
}
// Warenkorb ("Bestellung"): { weinId: Anzahl } im Browser gespeichert (localStorage)
const cart = {
  key: 'bsv-cart',
  get() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch (_) { return {}; } },
  set(c) {
    for (const k of Object.keys(c)) if (!(c[k] > 0)) delete c[k];
    try { localStorage.setItem(this.key, JSON.stringify(c)); } catch (_) {}
    renderCartCount();
  },
  add(id, n = 1) { const c = this.get(); c[id] = (c[id] || 0) + n; this.set(c); },
};
function renderCartCount() {
  const n = Object.values(cart.get()).reduce((a, b) => a + b, 0);
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = n;
    el.closest('.nav__cart')?.classList.toggle('has-items', n > 0);
  });
}
renderCartCount();
window.addEventListener('storage', (e) => { if (e.key === cart.key) renderCartCount(); });

// kurze Bestätigung unten am Bildschirm
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  if (!toastEl) return;
  toastEl.querySelector('.toast__text').textContent = msg;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.classList.remove('is-visible'); setTimeout(() => { toastEl.hidden = true; }, 300); }, 4000);
}

// "Zur Bestellung hinzufügen"
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  e.preventDefault();
  cart.add(b.dataset.add);
  b.classList.add('is-added');
  setTimeout(() => b.classList.remove('is-added'), 1200);
  toast(b.dataset.msg);
});

// Bestellseite: Mengen aus dem Warenkorb übernehmen und synchron halten
document.querySelectorAll('form[data-order]').forEach((form) => {
  const inputs = [...form.querySelectorAll('input[data-id]')];
  // ?wein=<id> (ältere Links): Wein hinzufügen, falls noch nicht im Warenkorb
  const pre = new URLSearchParams(location.search).get('wein');
  if (pre && inputs.some((i) => i.dataset.id === pre) && !cart.get()[pre]) cart.add(pre);
  const c = cart.get();
  inputs.forEach((i) => { i.value = c[i.dataset.id] || ''; });

  const update = () => {
    const s = orderSummary(form);
    form.querySelector('[data-wine-total]').textContent = chf(s.total);
    form.querySelector('[data-shipping-total]').textContent = chf(s.shipping);
    form.querySelector('[data-total]').textContent = chf(s.grand);
    form.querySelector('[data-clear]').hidden = !s.bottles;
    form.querySelector('[data-bottles]').textContent = s.bottles;
    form.querySelector('[data-bottles-label]').textContent = s.bottles === 1 ? form.dataset.bottleOne : form.dataset.bottleOther;
    // Kartons à 6 Flaschen; Hinweis, wenn der letzte Karton nicht voll ist
    const { boxes, missing } = s;
    form.querySelector('[data-boxes]').textContent = boxes;
    form.querySelector('[data-boxes-label]').textContent = boxes === 1 ? form.dataset.boxOne : form.dataset.boxOther;
    const warn = form.querySelector('[data-box-warn]');
    warn.hidden = !(s.bottles && missing);
    warn.textContent = (missing === 1 ? form.dataset.boxWarnOne : form.dataset.boxWarnOther).replace('{n}', missing);
    form.querySelector('[data-cart-empty]')?.toggleAttribute('hidden', s.bottles > 0);
  };
  form.addEventListener('input', () => {
    const next = {};
    inputs.forEach((i) => { const q = Math.max(0, parseInt(i.value, 10) || 0); if (q) next[i.dataset.id] = q; });
    cart.set(next);
    update();
  });
  // "Bestellung leeren"
  form.querySelector('[data-clear]').addEventListener('click', (e) => {
    if (!window.confirm(e.currentTarget.dataset.confirm)) return;
    inputs.forEach((i) => { i.value = ''; });
    form.dispatchEvent(new Event('input'));
  });
  // − / + / "+ 1 Karton"
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const input = b.closest('.order__row').querySelector('input[data-id]');
    input.value = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(b.dataset.step, 10)) || '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.addEventListener('order-sent', () => { cart.set({}); inputs.forEach((i) => { i.value = ''; }); update(); });
  update();
});

// Formulare per fetch an web3forms senden
document.querySelectorAll('form[data-ajax]').forEach((form) => {
  const status = form.querySelector('.form__status');
  const show = (msg, ok) => { status.hidden = false; status.textContent = msg; status.className = 'form__status ' + (ok ? 'is-ok' : 'is-error'); };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.order !== undefined) {
      const s = orderSummary(form);
      if (!s.bottles) { show(form.dataset.msgEmpty, false); return; }
      form.elements['Bestellung'].value = s.lines.join('\n');
      form.elements['Total'].value = `Wein ${chf(s.total)} + Porto ${chf(s.shipping)} (${s.boxes} Karton${s.boxes === 1 ? '' : 's'} à CHF ${form.dataset.shipping}) = ${chf(s.grand)}`
        + ` | ${s.bottles} Flaschen` + (s.missing ? `, letzter Karton nicht voll: ${6 - s.missing} von 6` : '');
    }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; show(form.dataset.msgSending, true);
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      form.reset();
      form.dispatchEvent(new Event(form.dataset.order !== undefined ? 'order-sent' : 'input'));
      show(form.dataset.msgSent, true);
    } catch (err) {
      console.error(err);
      show(form.dataset.msgError, false);
    } finally {
      btn.disabled = false;
    }
  });
});

// Sanftes Einblenden der Abschnitte beim Scrollen
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && reveals.length) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

// Fotos im Kopfbereich der Startseite: horizontal wechselnd, Endlosschleife
document.querySelectorAll('[data-slides]').forEach((root) => {
  const track = root.querySelector('.hero__track');
  const slides = [...track.children];
  const n = slides.length;
  if (n < 2) return;
  const hero = root.closest('.hero') || root;
  const dots = [...hero.querySelectorAll('.hero__dots [data-goto]')];
  const clone = slides[0].cloneNode(true);           // Kopie des ersten Fotos für den nahtlosen Übergang
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);
  const interval = (parseFloat(root.dataset.interval) || 6) * 1000;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer = null;

  const go = (k, animate = true) => {
    i = k;
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${-i * 100}%)`;
    const cur = i % n;
    slides.forEach((s, j) => s.toggleAttribute('aria-hidden', j !== cur));
    dots.forEach((d, j) => (j === cur ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };
  track.addEventListener('transitionend', () => { if (i === n) { go(0, false); void track.offsetWidth; } });
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (!reduce && !document.hidden) timer = setInterval(() => go(i + 1), interval); };

  dots.forEach((d) => d.addEventListener('click', () => { go(parseInt(d.dataset.goto, 10)); start(); }));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // Wischen auf Touch-Geräten
  let x0 = null;
  hero.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  hero.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) < 50) return;
    go(dx < 0 ? i + 1 : (i === 0 ? n - 1 : i - 1));
    start();
  });

  // weitere Fotos erst laden, wenn die Seite fertig ist
  const loadRest = () => track.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  if (document.readyState === 'complete') loadRest(); else window.addEventListener('load', loadRest);
  start();
});
