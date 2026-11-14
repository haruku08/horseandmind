# Go-live plan: from staging to the shared hosting

Status 14 Nov 2026. Hosting: unaxus.ch (cPanel). The old WordPress site stays online and untouched until step 4.

## Overview

| Step | Where | Who | Result |
|---|---|---|---|
| 1. Preview | GitHub Pages | Claude + you | Manuela reviews design, texts, photos, demo booking/CRM |
| 2. Prepare hosting | hosting panel + GitHub | you (Claude guides) | staging subdomain, FTP secrets, deploy works |
| 3. Test on the real server | staging.horseandmind.ch | Claude + you + Manuela | redirects, forms → Zoho, sign-off |
| 4. Switch | hosting panel + GitHub | you + Claude, ~1 hour | horseandmind.ch serves the new site |
| 5. Aftercare | Search Console, Zoho | Claude + you, 4 weeks | no lost rankings, forms arrive |

Email (info@horseandmind.ch) and DNS are not touched at any step – only the website files change.

---

## 1. Preview on GitHub Pages (now)

- Address: `https://haruku08.github.io/horseandmind/` (workflow `.github/workflows/pages.yml`, runs on every push).
- One-time: Settings → Pages → Source **GitHub Actions**; Settings → Environments → github-pages → allow the branch `claude/fervent-lamport-g7u1yk`. Pages on a private repo needs GitHub Pro.
- Shows: all pages, photos, demo booking + CRM (data stays in the visitor's browser), noindex.
- Does **not** test: redirects and `.htaccess` (Pages is not Apache), Zoho forms, Google Analytics.
- Goal: Manuela reads every page and lists corrections; fill the `[PLACEHOLDER]` facts (prices, durations, UID, Starlett).

## 2. Prepare the hosting (unaxus.ch, cPanel)

Hosting: **unaxus.ch**, managed hosting with **cPanel** (Apache). Login: myunaxus.com → Produkte → ⋯ next to the hosting package → Details anzeigen → **cPanel Login** (left menu). The main domain's folder is `public_html` (WordPress lives there now). cPanel cannot change the main domain's folder, so the switch uses method B (step 4).

1. **Subdomain:** cPanel → *Domains* (older cPanel: *Subdomains*) → create `staging.horseandmind.ch`. Set the document root **outside** `public_html`, e.g. `staging.horseandmind.ch` (next to `public_html`, not inside it). Inside `public_html` the WordPress `.htaccess` would also apply to the staging folder and spoil the redirect test.
2. **HTTPS:** cPanel → *SSL/TLS Status* → tick the subdomain → *Run AutoSSL* (free Let's Encrypt certificate). If AutoSSL is missing, ask unaxus support (some entry packages charge for SSL).
3. **Optional password:** cPanel → *Directory Privacy* → the staging folder → password protection. Good for privacy, but Claude's tests then need the password. Without it the site is still noindex.
4. **FTP account for the deploy:** cPanel → *FTP Accounts* → new account, e.g. `deploy-staging@horseandmind.ch`, strong password, **directory = the staging folder** from step 1. This account can only write there, so the WordPress site is safe.
5. **GitHub** (Settings → Secrets and variables → Actions):
   - Secrets: `FTP_SERVER` = `ftp.horseandmind.ch` (if that does not connect: the server name from cPanel's right column «Allgemeine Informationen» / unaxus welcome email), `FTP_USERNAME` = the full account name incl. `@horseandmind.ch`, `FTP_PASSWORD`, `FTP_DIR` = `./` (the account already starts in the staging folder).
   - Variable: `SITE_ENV` = `staging`.
6. Claude sets `apiBase` to `""` in `site.json` (forms → Zoho; the GitHub Pages preview keeps the demo via `API_BASE=mock` in `pages.yml`), merges into `main` and checks the deploy run log.

## 3. Test on staging.horseandmind.ch

Claude runs:
- **Redirect test**: all 54 old URLs (old sitemap) + older Google addresses against staging – each must answer 200 or 301 to the right page.
- Every page on phone and desktop: no sideways scrolling, no broken links, no script errors.
- HTTPS and www → bare domain, 404 page, `robots.txt` blocks crawlers, `X-Robots-Tag: noindex` header present.
- Page speed check (Lighthouse) on home, Kids and booking.

You / Manuela:
- **Forms → Zoho**: one camp sign-up and one contact message with the name «TEST». Check in Zoho that Lead Source, Fax (camp date), Twitter (child) and Description are filled; then delete the test leads.
- Calendly link from the booking page.
- Read Impressum, Datenschutz, AGB once more (legal check done?).
- **Sign-off by Manuela**: texts, prices, photos, camp dates for 2027 in `camps.json`.

## 4. Switch (go-live)

Pick a quiet weekday morning, not during a camp sign-up rush. About one hour, about one minute of downtime.

1. **Back up WordPress:** cPanel → *Backup* (or *Backup Wizard*) → download a **Home Directory** backup **and** the **MySQL database** backup (or phpMyAdmin → Export). Keep both for at least 3 months, also outside the hosting.
2. **Upload the new site next to WordPress:** cPanel → *FTP Accounts* → new account `deploy@horseandmind.ch` with directory `public_html`. In GitHub: change `FTP_USERNAME`/`FTP_PASSWORD` to this account, `FTP_DIR` = `./new/`, `SITE_ENV` = `production` → run the deploy (the production build refuses the demo backend, so the forms go to Zoho). WordPress keeps running; the new files are in `public_html/new/`.
3. **Switch (method B, in cPanel's File Manager):**
   - Create `public_html/wp-old/` and move **all** WordPress files and folders into it (`wp-admin`, `wp-content`, `wp-includes`, `wp-*.php`, `index.php`, `.htaccess`, …) – everything except `new/` and `wp-old/`. Show hidden files (Settings → «Show Hidden Files») so `.htaccess` moves too.
   - Move the **contents** of `public_html/new/` (incl. our `.htaccess` and `.ftp-deploy-sync-state.json`) up into `public_html/`, delete the empty `new/`.
   - Lock the old site: put a `.htaccess` with the single line `Require all denied` into `public_html/wp-old/`.
4. GitHub: `FTP_DIR` = `./` – all future deploys go straight to `public_html`.
5. **Smoke test right after** (Claude): home, Kids, camp page, booking page, one form → Zoho, redirect test against the live domain, `robots.txt` allows crawling, no `noindex` anywhere, cookie banner appears and Analytics loads after «Akzeptieren». cPanel → *SSL/TLS Status*: horseandmind.ch and www have a valid certificate.
6. **Google Search Console** (needs your Google account): verify the domain, submit `https://horseandmind.ch/sitemap.xml`, request indexing of the homepage. Same in Bing Webmaster Tools.
7. Delete the FTP account `deploy-staging` and the staging subdomain once nobody needs them.

### Rollback

- In File Manager: move the new files into a folder `new-site/`, remove the `Require all denied` file and move the contents of `wp-old/` back into `public_html` – about 5 minutes. Worst case: restore the cPanel backup – 15–30 minutes.
- Either way the old site comes back exactly as before; Zoho keeps every lead it received.

## 5. Aftercare (4 weeks)

- Week 1: daily look at Search Console (404s, redirect errors) and at Zoho (new leads arriving).
- Weeks 2–4: weekly; fix any missing redirect within a day.
- Google Business Profile: address Hegifeldstrasse 6B, link to the new site.
- After 3 months without problems: delete the WordPress files and database, cancel plugin licenses (Bookly, Uncode updates), keep the backup archive.

## Later, independent of the go-live

Own booking backend (Supabase, Frankfurt) + Google Calendar + emails, then the Zoho import (field meaning in `docs/old-site.md`). The website's forms switch from Zoho to the backend by changing `apiBase` – no page changes.

## What Claude needs from you

1. ~~Hosting provider~~ – unaxus.ch, cPanel.
2. Step 2: the staging subdomain with HTTPS, the FTP account, the 4 secrets and `SITE_ENV` in GitHub – then tell Claude «staging ready».
3. Manuela's corrections and sign-off; a date for the switch.
4. Access to Google Search Console (or do step 4.6 yourself with the guide above).
