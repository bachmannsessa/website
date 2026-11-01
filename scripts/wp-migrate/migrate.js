// WordPress (REST JSON export) -> Hugo content migration for bachmannsessa.ch
// usage: node migrate.js <wp-json-dir> <hugo-site-dir>
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const [WP, SITE] = process.argv.slice(2);
const load = (f) => JSON.parse(fs.readFileSync(path.join(WP, f), 'utf8'));
const pages = load('pages.json');
const posts = load('posts.json');
const media = fs.readdirSync(WP).filter((f) => /^media\d+\.json$/.test(f))
  .flatMap((f) => { const d = load(f); return Array.isArray(d) ? d : []; });
const mediaById = Object.fromEntries(media.map((m) => [m.id, m]));

const SKIP = new Set(['mein-konto', 'kasse', 'warenkorb', 'shop']);
const HOME = { startseite: 'de', borghirolovini: 'it' };
// DE top-level section  <->  IT top-level section
const SECTION_MAP = { geschichte: 'storia', rebsorten: 'tipi-die-vite', 'die-boden': 'il-terreno',
  'die-weine': 'i-vini', kontakt: 'contatto', bestellung: 'ordinazione' };
// child slug differences (IT slug -> DE slug)
const CHILD_MAP = { gewuerztraminer: 'gewurztraminer', '316-2': 'cavezze', 'il-viticoltore': 'der-winzer' };
// IT slugs to rename (keeps old URL as alias)
const RENAME = { '316-2': 'cavezze' };

// order of submenu entries, taken from the live DE menu
const MENU_ORDER = ['der-winzer', 'merlot', 'cabernet-sauvignon', 'cabernet-jura', 'marechal-foch', 'chamboursin',
  'sauvignon-blanc', 'completer', 'gewurztraminer', 'valle', 'roncho', 'cavezze', 'chioso', 'secch', 'borghirolo',
  'uno', 'uno-barrique', 'due', 'la-brace', 'chamboursin', 'sauvignon-blanc', 'tre', 'mademoiselle'];
const TOP_ORDER = ['bestellung', 'geschichte', 'rebsorten', 'die-boden', 'die-weine', 'kontakt'];

const decode = (s) => new JSDOM(`<p>${s}</p>`).window.document.querySelector('p').textContent;
const langOf = (p) => (/bachmannsessa\.ch\/it\//.test(p.link) ? 'it' : 'de');
const urlPath = (link) => new URL(link).pathname.replace(/^\/it\//, '/');

// ---------------- images ----------------
const downloads = new Map(); // remote url -> local web path
function localImage(url) {
  url = url.replace(/^http:/, 'https:').replace(/^\/\//, 'https://');
  const m = url.match(/\/wp-content\/uploads\/(.+)$/);
  if (!m) return url;
  const web = '/images/' + m[1];
  downloads.set(url, web);
  return web;
}
function featured(id) {
  const m = mediaById[id];
  if (!m) return id ? `__MISSING_MEDIA_${id}__` : null;
  const s = m.media_details && m.media_details.sizes || {};
  const pick = s['2048x2048'] || s['1536x1536'] || s.full;
  return localImage(pick ? pick.source_url : m.source_url);
}

// ---------------- html -> markdown ----------------
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '_', br: '\\' });
td.use(gfm);
td.keep(['iframe']);

function convert(html, shortcode) {
  const dom = new JSDOM(`<body>${html}</body>`);
  const doc = dom.window.document;
  doc.querySelectorAll('script,style,noscript').forEach((e) => e.remove());
  // replace Contact Form 7 forms with a hugo shortcode
  doc.querySelectorAll('.wp-block-contact-form-7-contact-form-selector, div.wpcf7').forEach((e) => {
    if (!e.isConnected) return;
    const ph = doc.createElement('p');
    ph.textContent = `SHORTCODE${shortcode || 'FORM'}SHORTCODE`;
    e.replaceWith(ph);
  });
  // images: rewrite src, unwrap links pointing to full-size uploads
  doc.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', localImage(img.getAttribute('src')));
    img.removeAttribute('srcset'); img.removeAttribute('sizes');
    const a = img.parentElement;
    if (a && a.nodeName === 'A' && /wp-content\/uploads\/.*\.(jpe?g|png|gif|webp)$/i.test(a.getAttribute('href') || '')) a.replaceWith(img);
  });
  doc.querySelectorAll('a[href]').forEach((a) => {
    let h = a.getAttribute('href');
    if (/wp-content\/uploads\//.test(h)) h = localImage(h);
    h = h.replace(/^https?:\/\/(www\.)?bachmannsessa\.ch/, '');
    h = h.replace(/^\/category\/news\/?$/, '/news/').replace(/^\/it\/category\/novita\/?$/, '/it/news/');
    a.setAttribute('href', h || '/');
  });
  doc.querySelectorAll('iframe').forEach((f) => {
    ['loading', 'style', 'frameborder'].forEach((a) => f.removeAttribute(a));
    f.setAttribute('loading', 'lazy');
  });
  let md = td.turndown(doc.body.innerHTML);
  md = md.replace(/^#+\s*$/gm, '')            // empty headings
    .replace(/ /g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/SHORTCODE(\w+)SHORTCODE/g, '{{< $1 >}}')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return md;
}

// ---------------- front matter ----------------
const yq = (s) => JSON.stringify(String(s));
function frontMatter(o) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) { if (v.length) lines.push(`${k}:`, ...v.map((x) => `  - ${yq(x)}`)); }
    else if (typeof v === 'number' || typeof v === 'boolean') lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${yq(v)}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}
function tzDate(p) {
  const local = new Date(p.date + 'Z'), gmt = new Date(p.date_gmt + 'Z');
  const off = Math.round((local - gmt) / 60000);
  const sign = off >= 0 ? '+' : '-', a = Math.abs(off);
  return `${p.date}${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
function write(rel, content) {
  const f = path.join(SITE, 'content', rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  console.log('wrote', rel);
}

// ---------------- pages ----------------
const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
const hasChildren = new Set(pages.map((p) => p.parent).filter(Boolean));
const IT2DE = Object.fromEntries(Object.entries(SECTION_MAP).map(([d, i]) => [i, d]));

for (const p of pages) {
  if (SKIP.has(p.slug) || p.status !== 'publish') continue;
  const lang = langOf(p);
  const title = decode(p.title.rendered);
  const image = featured(p.featured_media);
  const isHome = HOME[p.slug] === lang;
  const parent = p.parent ? byId[p.parent] : null;
  const slug = (lang === 'it' && RENAME[p.slug]) || p.slug;

  // translation key = the DE path
  let key;
  if (isHome) key = 'home';
  else if (!parent) key = lang === 'de' ? p.slug : (IT2DE[p.slug] || p.slug);
  else {
    const deParent = lang === 'de' ? parent.slug : IT2DE[parent.slug];
    const deSlug = lang === 'de' ? p.slug : (CHILD_MAP[p.slug] || p.slug);
    key = `${deParent}/${deSlug}`;
  }
  const leaf = key.split('/').pop();
  const weight = parent ? MENU_ORDER.indexOf(leaf) + 1 || 50 : TOP_ORDER.indexOf(leaf) + 1 || 50;

  const shortcode = /bestellung|ordinazione/.test(p.slug) ? 'bestellformular' : 'kontaktformular';
  let body = isHome ? '' : convert(p.content.rendered, shortcode);

  const aliases = [];
  if (lang === 'it' && RENAME[p.slug]) aliases.push(`/it${urlPath(p.link)}`);
  if (isHome && lang === 'it') aliases.push('/it/borghirolovini/');

  let rel;
  if (isHome) rel = `${lang}/_index.md`;
  else {
    const dir = parent ? `${parent.slug}/` : '';
    rel = hasChildren.has(p.id) ? `${lang}/${p.slug}/_index.md` : `${lang}/${dir}${slug}.md`;
  }
  write(rel, frontMatter({ title, date: tzDate(p), translationKey: key, weight, image, aliases }) + body + '\n');
}

// ---------------- posts ----------------
const de = posts.filter((p) => langOf(p) === 'de');
const it = posts.filter((p) => langOf(p) === 'it');
const pairs = new Map(); // it id -> de post
const used = new Set();
for (const p of it) { // 1. same featured image
  const m = de.find((d) => !used.has(d.id) && d.featured_media && d.featured_media === p.featured_media);
  if (m) { pairs.set(p.id, m); used.add(m.id); }
}
for (const p of it) { // 2. nearest DE post within 21 days
  if (pairs.has(p.id)) continue;
  const t = new Date(p.date);
  const c = de.filter((d) => !used.has(d.id)).map((d) => [Math.abs(t - new Date(d.date)) / 864e5, d])
    .filter(([days]) => days <= 21).sort((a, b) => a[0] - b[0])[0];
  if (c) { pairs.set(p.id, c[1]); used.add(c[1].id); }
}
console.log('\nPost translation pairs:');
for (const p of it) {
  const d = pairs.get(p.id);
  console.log(`  ${p.date.slice(0, 10)} ${p.slug}  <->  ${d ? d.date.slice(0, 10) + ' ' + d.slug : '(none)'}`);
}
for (const p of posts) {
  const lang = langOf(p);
  const key = lang === 'de' ? `news/${p.slug}` : (pairs.get(p.id) ? `news/${pairs.get(p.id).slug}` : `news/it-${p.slug}`);
  const fm = frontMatter({ title: decode(p.title.rendered), date: tzDate(p), slug: p.slug, translationKey: key, image: featured(p.featured_media) });
  write(`${lang}/news/${p.date.slice(0, 10)}-${p.slug}.md`, fm + convert(p.content.rendered) + '\n');
}

fs.writeFileSync(path.join(WP, 'downloads.json'), JSON.stringify([...downloads], null, 1));
console.log(`\n${downloads.size} images referenced -> downloads.json`);
