# Horse & Mind – Project Context

Rebuild of **horseandmind.ch**, the website of Manuela Pattynama (pferdegestütztes Coaching for children and adults, Winterthur). Site language: **German (Swiss)** – use "ss" not "ß", address visitors with "du".

## Where we are (as of 25 Oct 2026)

- Old site: WordPress 7.1 with a page builder, Bookly booking plugin, Calendly for the Erstgespräch, and HTML webforms posting to **Zoho CRM (free edition)**. Still live; untouched.
- New site: **static HTML** in this repo, built by `build.mjs` (Node, no dependencies – keep it dependency-free). All pages have content (written 26 Oct from facts found via Google's index of the old site – Manuela to review); remaining gaps are `[PLACEHOLDER]`s and a few todo boxes, both listed by the build. Not deployed yet.
- **Demo of booking + CRM (31 Oct):** `apiBase: "mock"` → `src/assets/js/mock-api.js` answers the booking API in the browser (localStorage, seeded example data) and powers the CRM at `/admin/` (`src/assets/js/admin.js`, `src/assets/css/admin.css`, `src/layout-admin.html`, page meta `"layout": "admin"`). Owner chose: no database, mock slots, no emails for now. Production build fails while mock is on.
- 1 Nov: pages simplified and rebuilt with apple.com-style components (see decision 2). Owner's final designs will follow.
- A design proposal canvas exists in claude.ai ("Horse & Mind Redesign"): homepage, camp page, camp sign-up on phone, 1:1 slot picker, mini-CRM inbox.

## Decisions made

1. **Static site, same URLs as the WordPress site** (SEO). Old URLs that changed are 301-redirected in `src/static/.htaccess`.
2. **Components (1 Nov 2026): apple.com as reference for components, not fonts.** `site.css` is a small component system: sticky blurred global nav (`.gnav`, full-screen menu on phones), section bar per area (`.lnav`, defined in `LOCAL_NAV` in build.mjs from page meta `nav`), centered heroes (`.hero`, `.hero--page`, `.hero-media`), tiles (`.tiles/.tile`, `--dark`, `--wide`), highlight cards (`.bento/.cell`), numbered steps (`.steps/.step`, only for real sequences), gallery with paddles (`[data-gallery]`), compare columns (`.compare`), spec rows (`.specs`), FAQ accordion, pill buttons (`.btn`, `--secondary`, `--light`, `--sm`) and "›" links (`.more`), form pages in `.form-layout`, booking picker as selection tiles. Footer: Apple-style with breadcrumbs (`{{crumbs}}`). Copy style: short headline with a period, one-line subhead, max. two actions. Radius scale: tiles 28 · cards 18 · controls 12 · pills.
3. **Look:** keep the current site's warmth. Owner likes the canvas colors and the rounded corners. Tokens are at the top of `src/assets/css/site.css` (cream ground, caramel accent `#8E4F24`, sage `#5F6B52`, radii 10–28px). Fonts (owner's choice, 1 Nov 2026): **Eczar** for titles, **Plus Jakarta Sans** for text – self-hosted in `src/assets/fonts/` (latin subset; Eczar 500/600, Jakarta 400/600/700). Eczar has no italic, so don't use italic display text. Final designs from the owner will follow; restyle then. Imagery is very important to the owner.
4. **Photos:** placeholders for now (`{{ph:Label|class}}` tokens). The owner will provide the original images later.
5. **Hosting/deploy:** GitHub repo (private) → GitHub Action builds and uploads `dist/` via FTP(S) to the existing host. Test on a staging subdomain first, then switch `FTP_DIR` to the live folder. Secrets needed: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`.
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

Build output also includes `sitemap.xml` (with git `<lastmod>`), `llms.txt` (summary for AI assistants) and per-page schema.org `@graph` (LocalBusiness, BreadcrumbList, Person on /ueber-uns/, Event per upcoming camp). FAQ blocks (`<details class="faq"><summary>…</summary><div class="faq-a">…</div></details>`) become FAQPage schema. `[ALL CAPS]` placeholders are highlighted on the page. The build warns about todo boxes, placeholders and empty photo slots. `SITE_ENV=production` makes the site indexable; anything else = noindex + robots block (deploy requires the repo variable `SITE_ENV`).

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
- [ ] Manuela reviews all page texts (written from Google-index facts, some of them possibly outdated: group of 4 in Reitpädagogik, 30/60-min kids intro, free phone Erstgespräch, KKP®-Trainerin, Verband membership, Parelli since 2014). Generic copy to check: FAQ answers, "Was du mitbringen solltest" on Kursort, /kids/ hub, AGB draft (sections 6–8 are suggestions)
- [ ] Fill `[PLACEHOLDER]`s: prices (old site showed CHF 45/90 min, 90, 110, 140 – conflicting, so none used), Reitpädagogik day/time/duration, Wingwave duration, sessions in the intensive coaching, UID, photo credits, hosting provider, Zoho data centre, AGB payment/cancellation terms
- [ ] Todo boxes: horses (names, photos), Kursort parking/ÖV, partner logos + links
- [ ] Real photos (13 slots, file names in README) + photo og-image
- [ ] Zoho webform keys into `site.json` → `zoho` (from the old site's form HTML), test both forms
- [ ] Full crawl of the live site (blocked from the cloud sandbox; allow `horseandmind.ch` in the environment's network settings) – remaining old URLs, plugins, tracking; real fonts/colors
- [ ] Next camp dates in `camps.json` (all 2026 dates are past)
- [ ] Legal check of Impressum, Datenschutz, AGB (Swiss nDSG; children's data and health notes)
- [ ] Google Business Profile with Hegifeldstrasse 6B
- [ ] Deploy: FTP secrets, repo variable `SITE_ENV=staging`, staging subdomain; go-live = back up WordPress, `SITE_ENV=production` + live `FTP_DIR`, test redirects, Search Console + Bing

Later (backend – replaces mock-api.js, same API + CRM functions):
- [ ] Durations for Coaching / Reitpädagogik in `site.json` services
- [ ] Booking backend (Supabase or Workers) + Google Calendar + emails
- [ ] Mini-CRM admin page
- [ ] Zoho CSV import

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
