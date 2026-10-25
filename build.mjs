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

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'dist');

const site = JSON.parse(fs.readFileSync(path.join(src, 'data/site.json'), 'utf8'));
const { camps } = JSON.parse(fs.readFileSync(path.join(src, 'data/camps.json'), 'utf8'));
const layout = fs.readFileSync(path.join(src, 'layout.html'), 'utf8');
const buildId = Date.now().toString(36);
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
    return `<div class="date" data-end="${c.end}">
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

function placeholder(arg) {
  const [label, cls] = arg.split('|');
  return `<div class="ph${cls ? ' ' + cls : ''}" role="img" aria-label="Foto folgt: ${esc(label)}"><span class="ph-label" aria-hidden="true">Foto: ${esc(label)}</span></div>`;
}

function renderTokens(html) {
  return html
    .replace(/\{\{camps:list:([a-z0-9-]+)\}\}/g, (_, id) => campList(id))
    .replace(/\{\{camps:band\}\}/g, () => campBand())
    .replace(/\{\{camps:options(?::([a-z0-9-]+))?\}\}/g, (_, id) => campOptions(id))
    .replace(/\{\{ph:([^}]+)\}\}/g, (_, a) => placeholder(a))
    .replace(/\{\{year\}\}/g, String(year));
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

const jsonld = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Horse & Mind',
  description: 'Pferdegestütztes Coaching für Kinder und Erwachsene in Winterthur',
  url: site.siteUrl,
  founder: { '@type': 'Person', name: 'Manuela Pattynama' },
  address: { '@type': 'PostalAddress', streetAddress: 'Hegifeldstrasse 6B', postalCode: '8404', addressLocality: 'Winterthur', addressCountry: 'CH' },
  sameAs: ['https://www.instagram.com/horseandmind', 'https://www.facebook.com/horseandmind.ch']
});

const clientConfig = JSON.stringify({ apiBase: site.apiBase, services: site.services, timezone: site.timezone }).replace(/</g, '\\u003c');

// ---- build ----
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copyDir(path.join(src, 'assets'), path.join(out, 'assets'));
copyDir(path.join(src, 'static'), out);

const pagesDir = path.join(src, 'pages');
const urls = [];
for (const file of walk(pagesDir).filter((f) => f.endsWith('.html'))) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s+([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`Missing <!--meta {...} --> in ${file}`);
  const meta = JSON.parse(m[1]);
  const rel = path.relative(pagesDir, path.dirname(file)).split(path.sep).join('/');
  const url = '/' + (rel ? rel + '/' : '');
  const content = renderTokens(raw.slice(m[0].length));
  const navKeys = ['erwachsene', 'kids', 'camps', 'ueber'];
  const vars = {
    title: esc(meta.title),
    description: esc(meta.description || ''),
    canonical: site.siteUrl + url,
    site_url: site.siteUrl,
    robots: meta.noindex ? 'noindex, follow' : 'index, follow',
    build_id: buildId,
    year: String(year),
    jsonld,
    config_json: clientConfig,
    content
  };
  for (const k of navKeys) vars['nav_' + k] = meta.nav === k ? ' aria-current="page"' : '';
  const html = layout.replace(/\{\{(\w+)\}\}/g, (all, k) => (k in vars ? vars[k] : all));
  const dest = path.join(out, rel, 'index.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  if (!meta.noindex) urls.push(url);
}

urls.sort();
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`Built ${urls.length} indexed pages (+ noindex pages) into dist/ · upcoming camps: ${upcoming.length} · today ${today}`);
