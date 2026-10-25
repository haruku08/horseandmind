# Horse & Mind – Project Context

Rebuild of **horseandmind.ch**, the website of Manuela Pattynama (pferdegestütztes Coaching for children and adults, Winterthur). Site language: **German (Swiss)** – use "ss" not "ß", address visitors with "du".

## Where we are (as of 25 Oct 2026)

- Old site: WordPress 7.1 with a page builder, Bookly booking plugin, Calendly for the Erstgespräch, and HTML webforms posting to **Zoho CRM (free edition)**. Still live; untouched.
- New site: **static HTML** in this repo, built by `build.mjs` (Node, no dependencies – the dev environment had no npm access, so keep it dependency-free). First commit pushed; not deployed yet.
- A design proposal canvas exists in claude.ai ("Horse & Mind Redesign"): homepage, camp page, camp sign-up on phone, 1:1 slot picker, mini-CRM inbox.

## Decisions made

1. **Static site, same URLs as the WordPress site** (SEO). Old URLs that changed are 301-redirected in `src/static/.htaccess`.
2. **Look:** keep the current site's warmth. Owner likes the canvas colors and the rounded corners. Tokens are at the top of `src/assets/css/site.css` (cream ground, caramel accent `#8E4F24`, sage `#5F6B52`, radii 10–28px). Fonts Cormorant Garamond (display) + Mulish (body) are **stand-ins** – the real fonts of the old site weren't checked yet. Imagery is very important to the owner.
3. **Photos:** placeholders for now (`{{ph:Label|class}}` tokens). The owner will provide the original images later.
4. **Hosting/deploy:** GitHub repo (private) → GitHub Action builds and uploads `dist/` via FTP(S) to the existing host. Test on a staging subdomain first, then switch `FTP_DIR` to the live folder. Secrets needed: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR`.
5. **Booking – direction agreed:** drop Bookly, Calendly and eventually Zoho. Build our own:
   - **1:1 sessions** (Erstgespräch, Coaching, Reitpädagogik): free slots read from **Manuela's Google Calendar** (free/busy), booking creates the event and sends the client a Google invite.
   - **Camps:** fixed dates with seat limits, waitlist when full.
   - **Mini-CRM** instead of Zoho: contacts, children (linked to parent), bookings with status (Neu → Kontaktiert → Gebucht → Bezahlt → Abgeschlossen), notes, CSV export, private admin page usable on phone. Each form may have its own fields (store extras in a flexible `details` JSON on the booking) – the owner currently misuses Zoho's ~10 free custom fields, this is a main reason to move.
   - Backend idea: **Supabase (EU region, Frankfurt)** for DB, auth and edge functions (Supabase is connected in claude.ai), or Cloudflare Workers. Secrets (Google, DB) must never be in the static site.
   - Confirmation/reminder emails via a sending service (e.g. Resend).
   - Not decided yet: payments online or not.
6. **Zoho migration (later):** owner will export Leads/Contacts as CSV and explain which misused field means what. Plan: map fields, dedupe by email, link parents/children, keep Zoho ID, dry run with report, then import; run both systems in parallel 1–2 weeks.

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
src/data/site.json            apiBase (empty = forms in test mode), services list
src/assets/css|js|img         styles, site.js (nav, camp dates, forms, slot picker)
src/static/                   .htaccess, robots.txt → site root
.github/workflows/deploy.yml  build + FTP deploy on push to main
```

Page tokens: `{{camps:list:<camp>}}`, `{{camps:band}}`, `{{camps:options:<camp>}}`, `{{ph:Label|class}}`, `{{year}}`. Page meta keys: `title`, `description`, `nav` (erwachsene|kids|camps|ueber), `noindex`.

## Booking API contract (frontend already built against it)

- `POST {apiBase}/bookings/camp` – camp sign-up: date id (or `interesse`), parent fields, `children: [{name, age, notes}]`, message, consent flags, `source`.
- `GET {apiBase}/slots?service=<id>&days=21` → `{ "days": [ { "date": "YYYY-MM-DD", "slots": ["09:00"] } ] }`
- `POST {apiBase}/bookings/appointment` – `service`, `start` (`YYYY-MM-DDTHH:MM`, Swiss time), contact fields.
- `POST {apiBase}/contact` – contact form.
- Responses: 2xx with optional `{message}`; errors with `{error}` (German, shown to user).
- Every form has a honeypot field `company` (must be empty) and `source` (`web:kids-camp`, `web:termin`, `web:kontakt`).
- While `apiBase` is empty: forms show a "Testversion" notice; `/termin/` shows a Calendly fallback.

## Open to-dos

- [ ] FTP secrets + staging subdomain; first deploy
- [ ] Real photos + `og-image.jpg` (1200×630)
- [ ] Check the old site's real fonts/colors and align if needed
- [ ] Carry over texts from old pages marked "Inhalt folgt" (Ruhe im Chaos, Kids, Reitpädagogik, Coaching, Wingwave, Epigenetik, Über uns, Kursort, Partner, AGB)
- [ ] Impressum + Datenschutz: fill placeholders ([E-MAIL], [TELEFON], providers), legal check (Swiss nDSG; children's data and health notes are stored)
- [ ] Self-host fonts before go-live
- [ ] Next camp dates in `camps.json` (all 2026 dates are past)
- [ ] Durations for Coaching / Reitpädagogik in `site.json` (only Erstgespräch = 30 min is known)
- [ ] Booking backend (Supabase or Workers) + Google Calendar + emails
- [ ] Mini-CRM admin page
- [ ] Zoho CSV import
- [ ] Go-live: back up WordPress (files + DB), switch FTP_DIR, test old URLs redirect

## Findings from the old site worth remembering

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
