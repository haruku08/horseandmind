# Horse & Mind – Project Context

Rebuild of **horseandmind.ch**, the website of Manuela Pattynama (pferdegestütztes Coaching for children and adults, Winterthur). Site language: **German (Swiss)** – use "ss" not "ß", address visitors with "du".

## Where we are (as of 25 Oct 2026)

- Old site: WordPress 7.1 with a page builder, Bookly booking plugin, Calendly for the Erstgespräch, and HTML webforms posting to **Zoho CRM (free edition)**. Still live; untouched.
- New site: **static HTML** in this repo, built by `build.mjs` (Node, no dependencies – keep it dependency-free). All pages have content (written 26 Oct from facts found via Google's index of the old site – Manuela to review); remaining gaps are `[PLACEHOLDER]`s and a few todo boxes, both listed by the build. Not deployed yet.
- **Demo of booking + CRM (31 Oct):** `apiBase: "mock"` → `src/assets/js/mock-api.js` answers the booking API in the browser (localStorage, seeded example data) and powers the CRM at `/admin/` (`src/assets/js/admin.js`, `src/assets/css/admin.css`, `src/layout-admin.html`, page meta `"layout": "admin"`). Owner chose: no database, mock slots, no emails for now. Production build fails while mock is on.
- 1 Nov: pages simplified and rebuilt with apple.com-style components (see decision 2). Owner's final designs will follow.
- **13 Nov: old site crawled** (`docs/old-site.md`): all 54 old URLs redirect or exist, Zoho keys + Manuela's field usage wired in, real facts taken over (Reitpädagogik schedule, kids price, AGB, partners), new page Leadership & Team, **photos from the old site in all 19 photo spots** (web versions until originals arrive), Google Analytics behind a consent banner. Heroes are full-screen.
- A design proposal canvas exists in claude.ai ("Horse & Mind Redesign"): homepage, camp page, camp sign-up on phone, 1:1 slot picker, mini-CRM inbox.

## Decisions made

1. **Static site, same URLs as the WordPress site** (SEO). Old URLs that changed are 301-redirected in `src/static/.htaccess`.
2. **Components (1 Nov 2026): apple.com as reference for components, not fonts.** `site.css` is a small component system: sticky blurred global nav (`.gnav`, full-screen menu on phones), **mega menu** instead of a section bar (13 Nov 2026: `MENU` in build.mjs → `{{nav_items}}`; Erwachsene/Kids/Über mich open a full-width panel with every page + one-line description + a photo, hover with delay / keyboard focus / first tap on touch, Escape closes, page dimmed behind; on phones the panels are plain lists in the full-screen menu; no CTA inside the panels – the only «Erstgespräch buchen» button is in the top bar), emotional photo hero on every page (`.hero` = one full-width photo `{{ph:…}}` with the text on it in `.hero-content`, dark shade at the bottom, slow settle animation; sizes `.hero` home, `.hero--page`, `.hero--short` for form pages; legal/404/danke have no hero), tiles (`.tiles/.tile`, `--dark`, `--wide`), highlight cards (`.bento/.cell`), numbered steps (`.steps/.step`, only for real sequences), gallery with paddles (`[data-gallery]`), compare columns (`.compare`), spec rows (`.specs`), FAQ accordion, pill buttons (`.btn`, `--secondary`, `--light`, `--sm`) and "›" links (`.more`), form pages in `.form-layout`, booking picker as selection tiles. Footer: Apple-style with breadcrumbs (`{{crumbs}}`). Copy style: short headline with a period, one-line subhead, max. two actions. Radius scale: tiles 28 · cards 18 · controls 12 · pills.
3. **Look (13 Nov 2026): Biings Design System as style reference** (biings.design, CC BY 4.0 – credited in the Impressum and site.css header; their name/logo and their commercial fonts Averta/Plush are not used). Apple-style structure stays; surfaces follow Biings; **colors are the old horseandmind.ch palette (13 Nov 2026)**: dark-brown text `#262318`, rose-white page `#FFF8F7`, tiles `#F6EEE8`, beige `#ECDFCE`, near-black dark tiles `#141618`, brand rose `#C2847A` (decoration only – too light for text) with `#94554B` as the readable accent for buttons/links, amber `#F7AB00` sparingly, small radii (tiles 18 · cards 12 · buttons/fields 9 · tags pill), soft shadows with lift on hover, pastel gradient cards from the old palette (rose, beige, amber, mist – tiles alternate automatically), film grain on tinted areas (`--grain`), gradient titles (dark brown→rose) on tile/compare titles and `.is-gradient` headlines, near-black dark tiles. Fonts: **Ubuntu 700 for the logo**, **Fraunces** for headlines, **Plus Jakarta Sans** for text – all self-hosted in `src/assets/fonts/` with their licenses. The CRM (`admin.css`) uses the same color tokens but an admin layout (13 Nov 2026): dark near-black sidebar with Ubuntu logo and rose active marker on desktop, dark top bar + bottom tabs on phones, tab-style filters, lists as tables from 900px, plain sans-serif (no Fraunces), status as segmented control. Owner: design only, no new CRM features for now. Imagery is very important to the owner.
4. **Photos:** every `{{ph:Label|class}}` spot now has a photo from the old site (`src/assets/img/photos/<slug>.jpg`, alt texts in `photos.json`); swap in the owner's originals with the same file names when they arrive.
4b. **Analytics + cookies:** Google Analytics 4 `G-RY5BHSBLTG` (site.json → analytics), loaded only in production builds and only after consent. The cookie banner (`site.js`, Akzeptieren/Ablehnen equally prominent) shows on every build incl. previews; choice in localStorage `hm-consent`; declining later deletes the `_ga*` cookies. Cookie policy page `/cookies/` (cookie table, current choice, «Cookie-Einstellungen ändern»); footer links «Cookies» + «Cookie-Einstellungen»; Datenschutz section `#analytics`.
4c. **Team:** Manuela only (Rahel Deloof from the old site left out, owner's decision 13 Nov 2026).
5. **Hosting/deploy:** GitHub repo (public since 13 Nov 2026, for free GitHub Pages) → GitHub Action builds and uploads `dist/` via FTP(S) to the existing host. Test on a staging subdomain first, then switch `FTP_DIR` to the live folder. Secrets needed: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`.
6. **Booking – direction agreed:** drop Bookly, Calendly and eventually Zoho. Build our own:
   - **1:1 sessions** (Erstgespräch, Coaching, Reitpädagogik): free slots read from **Manuela's Google Calendar** (free/busy), booking creates the event and sends the client a Google invite.
   - **Camps:** fixed dates with seat limits, waitlist when full.
   - **Mini-CRM** instead of Zoho: contacts, children (linked to parent), bookings with status (Neu → Kontaktiert → Gebucht → Bezahlt → Abgeschlossen), notes, CSV export, private admin page usable on phone. Each form may have its own fields (store extras in a flexible `details` JSON on the booking) – the owner currently misuses Zoho's ~10 free custom fields, this is a main reason to move.
   - Backend idea: **Supabase (EU region, Frankfurt)** for DB, auth and edge functions (Supabase is connected in claude.ai), or Cloudflare Workers. Secrets (Google, DB) must never be in the static site.
   - Confirmation/reminder emails via a sending service (e.g. Resend).
   - Not decided yet: payments online or not.
   - **Until our backend exists ("website only" phase):** contact and camp forms post to the existing **Zoho CRM webform** (`site.json` → `zoho`, keys still to copy from the old site), Erstgespräch via Calendly. Zoho redirects to `/danke/`.
7. **Zoho migration (later):** owner will export Leads/Contacts as CSV and explain which misused field means what. Plan: map fields, dedupe by email, link parents/children, keep Zoho ID, dry run with report, then import; run both systems in parallel 1–2 weeks.

## Options considered and set aside

- **PHP on the shared host** for the booking backend – dropped over security/maintenance concerns; use serverless functions instead.
- **Pure React app** – rejected: a browser-only app can't hold API keys; a static site plus small server functions is faster and better for SEO.
- **Zoho Bookings / keep Calendly** – would work with Zoho CRM, but the owner wants one simple system of their own.
- **Keep Zoho via webform or API** – possible (the free edition does include API access), but its field limits are the problem, so it gets replaced by the mini-CRM. Zoho stays running until the import is done.
- **Keep WordPress, only new theme** – rejected in favour of the static rebuild.

## Repo layout

```
build.mjs                     builder: src/ → dist/  (`node build.mjs`, `npm run preview`)
src/layout.html               header, nav, footer, meta
src/pages/**/index.html       one page per folder; starts with <!--meta {...} -->
src/data/camps.json           camp dates (past ones hide automatically, build + client side)
src/data/camps.mock.json      example camp dates, only merged in demo mode
src/data/site.json            apiBase, zoho webform bridge, services, address, venue, email, summary (feeds schema.org + llms.txt)
src/data/photos.json          alt texts for photos in src/assets/img/photos/ (file name = slot label slug)
src/assets/css|js|img|fonts   styles, site.js (nav, camp dates, forms, Zoho bridge, slot picker), self-hosted fonts
src/static/                   .htaccess, robots.txt → site root
.github/workflows/deploy.yml  build + FTP deploy on push to main
```

Build output also includes `sitemap.xml` (with git `<lastmod>`), `llms.txt` (summary for AI assistants) and per-page schema.org `@graph` (LocalBusiness, BreadcrumbList, Person on /ueber-uns/, Event per upcoming camp). FAQ blocks (`<details class="faq"><summary>…</summary><div class="faq-a">…</div></details>`) become FAQPage schema. `[ALL CAPS]` placeholders are highlighted on the page. The build warns about todo boxes, placeholders and empty photo slots. `SITE_ENV=production` makes the site indexable; anything else = noindex + robots block (deploy requires the repo variable `SITE_ENV`). `BASE_PATH=/sub` serves the site from a subfolder (GitHub Pages preview); links in HTML/CSS get the prefix, scripts use `HM_CONFIG.base`.

Old-site inventory (plugins, Zoho field meaning, facts, photo sources): `docs/old-site.md`.

Page tokens: `{{camps:list:<camp>}}`, `{{camps:band}}`, `{{camps:options:<camp>}}`, `{{ph:Label|class}}`, `{{year}}`. Page meta keys: `title`, `description`, `nav` (erwachsene|kids|camps|ueber), `noindex`.

## Booking API contract (frontend already built against it)

- `POST {apiBase}/bookings/camp` – camp sign-up: date id (or `interesse`), parent fields, `children: [{name, age, notes}]`, message, consent flags, `source`.
- `GET {apiBase}/slots?service=<id>&days=21` → `{ "days": [ { "date": "YYYY-MM-DD", "slots": ["09:00"] } ] }`
- `POST {apiBase}/bookings/appointment` – `service`, `start` (`YYYY-MM-DDTHH:MM`, Swiss time), contact fields.
- `POST {apiBase}/contact` – contact form.
- Responses: 2xx with optional `{message}`; errors with `{error}` (German, shown to user).
- Every form has a honeypot field `company` (must be empty) and `source` (`web:kids-camp`, `web:termin`, `web:kontakt`).
- While `apiBase` is empty: forms post to Zoho if `site.json → zoho.<form>.action` is set, otherwise they ask the visitor to email; `/termin/` shows a Calendly fallback.

## Open to-dos

Website:
- [ ] Manuela reviews all page texts. Facts now from the old site (13 Nov): Reitpädagogik schedule + waitlist, kids 1:1 ab CHF 110/h, Leadership «Preis nach Absprache», AGB, partners. Still generic copy to check: FAQ answers, «Was du mitbringen solltest» (Kursort), /kids/ hub, Leadership page
- [ ] Fill `[PLACEHOLDER]`s (build lists them): adult coaching price, Ruhe im Chaos sessions + price, Wingwave duration + price, Reitpädagogik price (old CHF 45 not on current page), UID, photo credits, hosting provider, Starlett's character
- [ ] Todo boxes: more horses (names/photos), Kursort parking/ÖV
- [ ] Original photos to replace the web versions (same file names), photo og-image
- [ ] Switch forms to Zoho for go-live: `site.json` apiBase `""` (now `"mock"` for the demo); keys are filled. Send one real test lead per form
- [ ] Next camp dates in `camps.json` (all 2026 dates are past)
- [ ] Legal check of Impressum, Datenschutz (now incl. Google Analytics, Zoho EU, Calendly), AGB
- [ ] Google Business Profile with Hegifeldstrasse 6B
- [x] Preview on GitHub Pages: https://haruku08.github.io/horseandmind/ (`.github/workflows/pages.yml`, `BASE_PATH=/horseandmind`). Repo is **public** since 13 Nov 2026. Pages deploys only from `main` → merge the work branch into `main` to update the preview. FTP deploy (`deploy.yml`) is skipped until `SITE_ENV` is set.
- [ ] Hosting staging + switch: follow `docs/go-live-plan.md` (FTP secrets, `SITE_ENV`, staging subdomain, redirect test, Zoho test leads, backup, document-root switch, Search Console)

Later (backend – replaces mock-api.js, same API + CRM functions):
- [ ] Durations for Coaching / Reitpädagogik in `site.json` services
- [ ] Booking backend (Supabase or Workers) + Google Calendar + emails
- [ ] Mini-CRM admin page
- [ ] Zoho CSV import (field meaning in `docs/old-site.md`)

## Findings from the old site worth remembering

- 26 Oct 2026: «Ruhe im Chaos» is for **parents of neurodivergent children** (ADHS, ASS), a 3-month intensive with Epigenetik, Selbstliebe, Kommunikation – not a general adult offer. "Erwachsene" nav now goes to /pferdeunterstuetztes-coaching/ (hub). More old URLs found and redirected (see `.htaccess`), incl. Bookly pages under /buchung/ (→ /termin/, except our camp sign-up). Old phone on the site: +41 76 507 78 37.

- Review 25 Oct 2026 (via Google index; live site not reachable from the sandbox): indexed URLs include `/kids/` and `/kids/workshop/` – now a `/kids/` hub page and a 301 for the workshop. Official address confirmed: Hegifeldstrasse 6B, 8404 Winterthur. Public email: info@horseandmind.ch.
- Searching "Manuela Pattynama Horse & Mind" finds nothing – weak entity signal for Google and AI assistants; the Über-mich page, Person schema and consistent name/address across profiles fix that.

- Camp dates were stale (past dates still shown as "Warteliste") – hence automatic hiding.
- Zoho "Lead Source" dropdown was visible to visitors – now a hidden `source` field.
- Impressum, Datenschutz and Cookie Policy all linked to the same page – now separate.
- Steps said "15 Min Kennenlerngespräch" but Calendly is 30 min – resolved to no fixed duration in copy.
- Typos fixed in carried-over text (Voltigier-, Western-Reitstil, übernimmt).

## Working conventions

- Keep the site dependency-free unless there's a strong reason; plain HTML/CSS/JS.
- Accessible markup: real buttons/links/labels, 44px touch targets, visible focus.
- Don't invent facts (prices, durations, dates) – use `[PLACEHOLDER]` and list it in the to-dos.
- Commit messages in English; site copy in Swiss German.
