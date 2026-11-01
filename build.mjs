#!/usr/bin/env node
// Horse & Mind – tiny static site builder. No dependencies: `node build.mjs`.
//
// src/layout.html          shared page frame (header, footer)
// src/pages/**/index.html  one file per page; URL = folder path
// src/data/*.json          camp dates and site settings
// src/assets, src/static   copied as-is (static/ goes to the site root)
//
// Page files start with a meta comment:
//   <!--meta {"title": "...", "description": "...", "nav": "camps"} -->
// and may use these tokens:
//   {{camps:list:<camp-id>}}  upcoming dates of one camp as cards
//   {{camps:band}}            homepage teaser for the next camp
//   {{camps:options}}         <option>s for the booking form
//   {{ph:Label|class}}        image placeholder (swap for a real <img> later)
//   {{year}}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'dist');

const site = JSON.parse(fs.readFileSync(path.join(src, 'data/site.json'), 'utf8'));
const { camps: realCamps } = JSON.parse(fs.readFileSync(path.join(src, 'data/camps.json'), 'utf8'));
const layouts = {
  site: fs.readFileSync(path.join(src, 'layout.html'), 'utf8'),
  admin: fs.readFileSync(path.join(src, 'layout-admin.html'), 'utf8')
};
const buildId = Date.now().toString(36);

// SITE_ENV=production → indexable. Anything else (staging, local) → noindex everywhere,
// robots.txt blocks all crawlers and Apache sends X-Robots-Tag, so test copies never land in Google.
const ENV = process.env.SITE_ENV || 'development';
const PROD = ENV === 'production';

// apiBase "mock": demo backend in the browser (src/assets/js/mock-api.js) plus example camp dates.
const MOCK = site.apiBase === 'mock';
if (MOCK && PROD) throw new Error('site.json apiBase is "mock" – the demo backend must not go live. Set a real apiBase (or "" for Zoho) first.');
const camps = MOCK
  ? realCamps.concat(JSON.parse(fs.readFileSync(path.join(src, 'data/camps.mock.json'), 'utf8')).camps)
  : realCamps;
const year = new Date().getFullYear();

// "Today" in Swiss time, as YYYY-MM-DD, so a camp disappears the day after it ends.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: site.timezone }).format(new Date());

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parts(iso) { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; }
export function formatRange(start, end) {
  const a = parts(start), b = parts(end);
  if (a.y === b.y && a.m === b.m) return `${a.d}.–${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d}. ${MONTHS[a.m - 1]} – ${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d}. ${MONTHS[a.m - 1]} ${a.y} – ${b.d}. ${MONTHS[b.m - 1]} ${b.y}`;
}
function shortRange(start, end) {
  const a = parts(start), b = parts(end);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(a.d)}.${p(a.m)}.–${p(b.d)}.${p(b.m)}.${String(b.y).slice(2)}`;
}

function campState(c) {
  if (c.status === 'full') return { chip: 'Ausgebucht', cls: 'full', cta: 'Auf die Warteliste', wait: true };
  if (c.status === 'waitlist') return { chip: 'Warteliste', cls: 'wait', cta: 'Auf die Warteliste', wait: true };
  if (typeof c.seatsLeft === 'number') {
    if (c.seatsLeft <= 0) return { chip: 'Ausgebucht', cls: 'full', cta: 'Auf die Warteliste', wait: true };
    const label = c.seatsLeft === 1 ? 'Noch 1 Platz frei' : `Noch ${c.seatsLeft} Plätze frei`;
    return { chip: label, cls: c.seatsLeft <= 3 ? 'few' : 'open', cta: 'Anmelden', wait: false };
  }
  return { chip: 'Plätze frei', cls: 'open', cta: 'Anmelden', wait: false };
}

const upcoming = camps
  .filter((c) => c.end >= today)
  .sort((a, b) => a.start.localeCompare(b.start));

function bookingUrl(c, wait) {
  return `/buchung/${c.camp}/?datum=${encodeURIComponent(c.id)}${wait ? '&amp;warteliste=1' : ''}`;
}

function campList(campId) {
  const list = upcoming.filter((c) => c.camp === campId);
  const empty = `<div class="dates-empty" data-dates-empty${list.length ? ' hidden' : ''}>
  <p><strong>Neue Daten folgen bald.</strong> Trag dich unverbindlich ein – du erfährst als Erste:r, wann das nächste Camp stattfindet.</p>
  <p style="margin-top:14px"><a class="btn" href="/buchung/${campId}/?interesse=1">Interesse melden</a></p>
</div>`;
  const cards = list.map((c) => {
    const s = campState(c);
    return `<div class="date" data-id="${c.id}" data-end="${c.end}">
  <div class="date-main">
    <span class="date-when">${formatRange(c.start, c.end)}</span>
    <span class="date-meta">${esc(c.season)} · ${esc(c.time)} · CHF ${c.price}</span>
  </div>
  <span class="chip chip--${s.cls}">${s.chip}</span>
  <a class="btn${s.wait ? ' btn--outline' : ''}" href="${bookingUrl(c, s.wait)}">${s.cta}</a>
</div>`;
  }).join('\n');
  return `<div class="dates" data-dates>\n${cards}\n${empty}\n</div>`;
}

function campBand() {
  const c = upcoming.find((x) => x.status !== 'full');
  if (!c) {
    return `<div class="band">
  <div class="band-info">
    <p class="eyebrow">Kids Camp</p>
    <h2>Das Land der Gefühle</h2>
    <p>Neue Daten folgen bald – melde dein Interesse, dann erfährst du es zuerst.</p>
  </div>
  <div class="band-action"><a class="btn btn--light" href="/kids/land-der-gefuehle/">Mehr zum Camp</a></div>
</div>`;
  }
  const s = campState(c);
  return `<div class="band" data-end="${c.end}">
  <div class="band-info">
    <p class="eyebrow">Nächstes Kids Camp</p>
    <h2>${esc(c.title)}</h2>
    <p>${formatRange(c.start, c.end)} · ${esc(c.time)} · CHF ${c.price} · Binzenloo, Winterthur</p>
  </div>
  <div class="band-action">
    <span class="chip chip--${s.cls}">${s.chip}</span>
    <a class="btn btn--light" href="${bookingUrl(c, s.wait)}">${s.wait ? 'Auf die Warteliste' : 'Jetzt anmelden'}</a>
  </div>
</div>`;
}

function campOptions(campId) {
  const list = upcoming.filter((c) => !campId || c.camp === campId);
  const opts = list.map((c) => {
    const s = campState(c);
    const suffix = s.wait ? ' (Warteliste)' : '';
    return `<option value="${c.id}" data-end="${c.end}" data-wait="${s.wait ? 1 : 0}" data-label="${esc(formatRange(c.start, c.end))}" data-meta="${esc(`${c.time} · CHF ${c.price} · ${s.chip}`)}">${esc(c.title)} ${shortRange(c.start, c.end)}${suffix}</option>`;
  });
  opts.push('<option value="interesse" data-label="Nächstes Camp" data-meta="Unverbindlich – wir melden uns, sobald die Daten stehen">Interesse fürs nächste Camp (unverbindlich)</option>');
  return opts.join('\n');
}

// Photo slots: {{ph:Label|class}} shows a placeholder until a photo named after the label
// exists in src/assets/img/photos/ (e.g. "Kinder mit Pferden" → kinder-mit-pferden.jpg).
// Alt texts come from src/data/photos.json (falls back to the label).
const PHOTO_DIR = path.join(src, 'assets/img/photos');
const photoAlts = fs.existsSync(path.join(src, 'data/photos.json')) ? JSON.parse(fs.readFileSync(path.join(src, 'data/photos.json'), 'utf8')) : {};
const slug = (t) => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const missingPhotos = new Set();
let photoIndex = 0; // reset per page; the first image on a page loads eagerly (it's above the fold)

function placeholder(arg) {
  const [label, cls] = arg.split('|');
  const name = slug(label);
  const file = ['webp', 'jpg', 'jpeg', 'png'].map((ext) => `${name}.${ext}`).find((f) => fs.existsSync(path.join(PHOTO_DIR, f)));
  const first = photoIndex++ === 0;
  if (file) {
    const alt = photoAlts[name] || label;
    const load = first ? 'fetchpriority="high"' : 'loading="lazy"';
    return `<figure class="ph has-photo${cls ? ' ' + cls : ''}"><img src="/assets/img/photos/${file}" alt="${esc(alt)}" ${load} decoding="async"></figure>`;
  }
  missingPhotos.add(name);
  return `<div class="ph${cls ? ' ' + cls : ''}" role="img" aria-label="Foto folgt: ${esc(label)}"><span class="ph-label" aria-hidden="true">Foto: ${esc(label)}</span></div>`;
}

// [PLACEHOLDER] text (facts we don't know yet) gets highlighted and reported by the build.
const TBD = /\[([A-ZÄÖÜ]{3}[^\]\n<>"]*)\]/g;

function renderTokens(html) {
  return html
    .replace(/\{\{camps:list:([a-z0-9-]+)\}\}/g, (_, id) => campList(id))
    .replace(/\{\{camps:band\}\}/g, () => campBand())
    .replace(/\{\{camps:options(?::([a-z0-9-]+))?\}\}/g, (_, id) => campOptions(id))
    .replace(/\{\{ph:([^}]+)\}\}/g, (_, a) => placeholder(a))
    .replace(/\{\{year\}\}/g, String(year))
    .replace(TBD, (all) => `<span class="tbd">${all}</span>`);
}

// FAQ blocks (<details class="faq"><summary>Q</summary><div class="faq-a">A</div></details>) → FAQPage schema
function faqsIn(html) {
  const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  return [...html.matchAll(/<details class="faq">\s*<summary>([\s\S]*?)<\/summary>\s*<div class="faq-a">([\s\S]*?)<\/div>\s*<\/details>/g)]
    .map((m) => ({ q: text(m[1]), a: text(m[2]) }));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  for (const file of walk(from)) {
    const dest = path.join(to, path.relative(from, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
}

// ---- structured data (schema.org) ----
// One business entity, referenced by @id from every page, plus page-specific
// parts: breadcrumbs everywhere, Person on /ueber-uns/, Event per upcoming camp.
const BIZ_ID = site.siteUrl + '/#business';
const PERSON_ID = site.siteUrl + '/ueber-uns/#manuela';
const business = {
  '@type': 'LocalBusiness',
  '@id': BIZ_ID,
  name: 'Horse & Mind',
  description: 'Pferdegestütztes Coaching für Kinder und Erwachsene in Winterthur',
  url: site.siteUrl + '/',
  ...(site.email ? { email: site.email } : {}),
  image: site.siteUrl + '/assets/img/og-image.jpg',
  founder: { '@id': PERSON_ID },
  address: { '@type': 'PostalAddress', ...site.address },
  areaServed: site.areaServed,
  knowsAbout: ['Pferdegestütztes Coaching', 'Reitpädagogik', 'Wingwave', 'Epigenetik', 'Coaching für Kinder'],
  sameAs: site.sameAs
};
const person = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Manuela Pattynama',
  jobTitle: 'Coach für pferdegestütztes Coaching',
  worksFor: { '@id': BIZ_ID },
  url: site.siteUrl + '/ueber-uns/'
};
const venue = {
  '@type': 'Place',
  name: site.venue.name,
  address: { '@type': 'PostalAddress', ...site.venue.address }
};

// Swiss UTC offset on a given day, e.g. "+02:00" in summer.
function zurichOffset(isoDate) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: site.timezone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(isoDate + 'T12:00:00Z')).find((p) => p.type === 'timeZoneName').value;
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '');
}

function campEvent(c, pageUrl) {
  const days = Math.round((Date.parse(c.end) - Date.parse(c.start)) / 86400000) + 1;
  const [from, to] = c.time.split(/[–-]/).map((t) => t.trim().replace('.', ':'));
  const s = campState(c);
  return {
    '@type': 'Event',
    name: `Kids Camp «${c.title}»`,
    startDate: `${c.start}T${from}${zurichOffset(c.start)}`,
    endDate: `${c.end}T${to}${zurichOffset(c.end)}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: venue,
    organizer: { '@id': BIZ_ID },
    image: site.siteUrl + '/assets/img/og-image.jpg',
    description: `${c.season}, ${days} ${days === 1 ? 'Vormittag' : 'Vormittage'} mit Pferden, Kinder-Yoga und kreativen Übungen in Winterthur.`,
    offers: {
      '@type': 'Offer', price: c.price, priceCurrency: 'CHF', url: pageUrl,
      availability: s.wait ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock'
    }
  };
}

function breadcrumbs(url, title) {
  if (url === '/') return null;
  const segs = url.split('/').filter(Boolean);
  const items = [{ name: 'Startseite', url: '/' }];
  let acc = '/';
  segs.forEach((seg, i) => {
    acc += seg + '/';
    const known = pageTitles.get(acc);
    if (i === segs.length - 1) items.push({ name: title, url: acc });
    else if (known) items.push({ name: known, url: acc });
  });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: site.siteUrl + it.url }))
  };
}

function jsonldFor(url, meta, faqs) {
  const short = crumb(meta.title);
  const graph = [business];
  if (url === '/ueber-uns/') graph.push(person);
  const bc = meta.noindex ? null : breadcrumbs(url, short);
  if (bc) graph.push(bc);
  const campId = url.match(/^\/kids\/([a-z0-9-]+)\/$/)?.[1];
  if (campId) for (const c of upcoming.filter((x) => x.camp === campId)) graph.push(campEvent(c, site.siteUrl + url));
  if (faqs.length) graph.push({
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

// Section bar under the global nav (apple.com "local nav"): one per area of the site.
const LOCAL_NAV = {
  erwachsene: { title: 'Coaching', href: '/pferdeunterstuetztes-coaching/', links: [
    ['Übersicht', '/pferdeunterstuetztes-coaching/'], ['Ruhe im Chaos', '/ruhe-im-chaos/'], ['Wingwave', '/wing-wave/'], ['Epigenetik', '/epigenetik/']] },
  kids: { title: 'Kids', href: '/kids/', links: [
    ['Übersicht', '/kids/'], ['Einzelbegleitung', '/kids/in-der-ruhe-liegt-die-kraft-mit-pferden/'], ['Reitpädagogik', '/kids/reitpaedagogik/'], ['Kids Camp', '/kids/land-der-gefuehle/']] },
  ueber: { title: 'Über mich', href: '/ueber-uns/', links: [
    ['Manuela', '/ueber-uns/'], ['Kursort', '/ueber-uns/kursort-binzenloo-winterthur/'], ['Partner', '/ueber-uns/meine-partner/'], ['Kontakt', '/kontakt/']] }
};
LOCAL_NAV.camps = LOCAL_NAV.kids;

function localNav(url, meta) {
  const ln = LOCAL_NAV[meta.nav];
  if (!ln || meta.layout) return '';
  const links = ln.links.map(([label, href]) => `<a href="${href}"${href === url ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<nav class="lnav" aria-label="${esc(ln.title)}"><div class="wrap"><a class="lnav-title" href="${ln.href}">${esc(ln.title)}</a><div class="lnav-links">${links}</div><a class="btn btn--sm" href="/termin/">Erstgespräch</a></div></nav>`;
}

// Breadcrumb trail in the footer (the same path as the BreadcrumbList schema)
function crumbTrail(url, meta) {
  if (url === '/' || meta.noindex) return '';
  const segs = url.split('/').filter(Boolean);
  const items = ['<li><a href="/">Horse &amp; Mind</a></li>'];
  let acc = '/';
  segs.forEach((seg, i) => {
    acc += seg + '/';
    const name = i === segs.length - 1 ? crumb(meta.title) : pageTitles.get(acc);
    if (!name) return;
    items.push(i === segs.length - 1 ? `<li><span aria-current="page">${esc(name)}</span></li>` : `<li><a href="${acc}">${esc(name)}</a></li>`);
  });
  return `<ol class="crumbs" aria-label="Pfad">${items.join('')}</ol>`;
}

// Last change of a page, from git (needs full history in CI: fetch-depth 0).
function lastmod(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim() || null;
  } catch { return null; }
}

const clientConfig = JSON.stringify({
  apiBase: site.apiBase, services: site.services, timezone: site.timezone, email: site.email, zoho: site.zoho,
  camps: upcoming.map((c) => ({ id: c.id, title: c.title, start: c.start, end: c.end, time: c.time, price: c.price, seats: c.seats ?? null, label: formatRange(c.start, c.end) }))
}).replace(/</g, '\\u003c');

const demoBar = MOCK
  ? '<div class="demo-bar" role="note">Demo: Buchungen werden nur in diesem Browser gespeichert. <a href="/admin/">Zum CRM</a></div>'
  : '';
const mockScript = MOCK ? `<script src="/assets/js/mock-api.js?v=${buildId}" defer></script>` : '';

// ---- build ----
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copyDir(path.join(src, 'assets'), path.join(out, 'assets'));
copyDir(path.join(src, 'static'), out);

const pagesDir = path.join(src, 'pages');
const pages = walk(pagesDir).filter((f) => f.endsWith('.html')).map((file) => {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s+([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Missing <!--meta {...} --> in ${file}`);
  const rel = path.relative(pagesDir, path.dirname(file)).split(path.sep).join('/');
  return { file, raw, body: raw.slice(m[0].length), meta: JSON.parse(m[1]), rel, url: '/' + (rel ? rel + '/' : '') };
});
const crumb = (t) => t.split(' | ')[0].split(' – ')[0];
const pageTitles = new Map(pages.map((p) => [p.url, crumb(p.meta.title)]));

const indexed = [];
const unfinished = [];
const tbd = [];
for (const { file, body, meta, rel, url } of pages) {
  photoIndex = 0;
  const content = renderTokens(body);
  const faqs = faqsIn(content);
  const navKeys = ['erwachsene', 'kids', 'camps', 'ueber'];
  const vars = {
    title: esc(meta.title),
    description: esc(meta.description || ''),
    canonical: site.siteUrl + url,
    site_url: site.siteUrl,
    robots: !PROD ? 'noindex, nofollow' : meta.noindex ? 'noindex, follow' : 'index, follow',
    build_id: buildId,
    year: String(year),
    jsonld: jsonldFor(url, meta, faqs),
    config_json: clientConfig,
    demo_bar: demoBar,
    lnav: localNav(url, meta),
    crumbs: crumbTrail(url, meta),
    mock_script: mockScript,
    content
  };
  for (const k of navKeys) vars['nav_' + k] = meta.nav === k ? ' aria-current="page"' : '';
  const html = layouts[meta.layout || 'site'].replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all));
  const dest = path.join(out, rel, 'index.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  if (/class="todo"/.test(body)) unfinished.push(url);
  for (const m of body.matchAll(TBD)) tbd.push(`${url} ${m[0]}`);
  if (!meta.noindex) indexed.push({ url, meta, lastmod: lastmod(file) });
}

indexed.sort((a, b) => a.url.localeCompare(b.url));
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((p) => `  <url><loc>${site.siteUrl}${p.url}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);

// llms.txt: a plain summary for AI assistants and answer engines (llmstxt.org).
const llmsGroups = [
  ['Angebot', (u) => !/^\/(ueber-uns|kontakt|termin|impressum|datenschutz|agb)\//.test(u) && u !== '/'],
  ['Über Horse & Mind', (u) => /^\/(ueber-uns|kontakt|termin)\//.test(u)],
  ['Rechtliches', (u) => /^\/(impressum|datenschutz|agb)\//.test(u)]
];
const campLines = upcoming.map((c) => `- ${c.title}: ${formatRange(c.start, c.end)}, ${c.time} Uhr, CHF ${c.price} (${campState(c).chip})`);
const llms = [
  '# Horse & Mind',
  '',
  `> ${site.summary}`,
  '',
  `- Inhaberin: Manuela Pattynama`,
  `- Adresse: ${site.address.streetAddress}, ${site.address.postalCode} ${site.address.addressLocality}`,
  `- Kursort: ${site.venue.name}, ${site.venue.address.streetAddress}, ${site.venue.address.postalCode} ${site.venue.address.addressLocality}`,
  ...(site.email ? [`- E-Mail: ${site.email}`] : []),
  `- Erstgespräch online buchen: ${site.siteUrl}/termin/`,
  '',
  '## Nächste Kids Camps',
  '',
  ...(campLines.length ? campLines : ['- Neue Daten folgen bald. Interesse melden: ' + site.siteUrl + '/kids/land-der-gefuehle/']),
  '',
  ...llmsGroups.flatMap(([h, test]) => {
    const list = indexed.filter((p) => test(p.url));
    return list.length ? [`## ${h}`, '', ...list.map((p) => `- [${p.meta.title.split(' | ')[0]}](${site.siteUrl}${p.url}): ${p.meta.description || ''}`), ''] : [];
  })
].join('\n');
fs.writeFileSync(path.join(out, 'llms.txt'), llms);

if (!PROD) {
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.appendFileSync(path.join(out, '.htaccess'), '\n# Not production: keep this copy out of search engines\n<IfModule mod_headers.c>\n  Header always set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n');
}

if (!fs.existsSync(path.join(src, 'assets/img/og-image.jpg'))) console.warn('⚠ Missing src/assets/img/og-image.jpg (social preview image, 1200×630).');
if (unfinished.length) console.warn(`⚠ ${unfinished.length} pages still contain "Inhalt folgt"/todo boxes:\n  ${unfinished.join('\n  ')}`);

if (tbd.length) console.warn(`⚠ ${tbd.length} [PLACEHOLDER] facts still open:\n  ${tbd.join('\n  ')}`);
if (missingPhotos.size) console.warn(`⚠ ${missingPhotos.size} photo slots still empty (put files in src/assets/img/photos/): ${[...missingPhotos].join(', ')}`);
console.log(`[${ENV}${PROD ? '' : ' – noindex, robots blocked'}] Built ${indexed.length} indexed pages (+ noindex pages) into dist/ · upcoming camps: ${upcoming.length} · today ${today}`);
