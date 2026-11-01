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
  return { lines, total, bottles };
}
document.querySelectorAll('form[data-order]').forEach((form) => {
  const update = () => {
    const s = orderSummary(form);
    form.querySelector('[data-total]').textContent = chf(s.total);
    form.querySelector('[data-bottles]').textContent = s.bottles;
  };
  form.addEventListener('input', update);
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
      form.elements['Total'].value = `${chf(s.total)} (${s.bottles} Flaschen, zzgl. Porto CHF ${form.dataset.shipping}/6er-Karton bei Versand)`;
    }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; show(form.dataset.msgSending, true);
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      form.reset();
      form.dispatchEvent(new Event('input'));
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
