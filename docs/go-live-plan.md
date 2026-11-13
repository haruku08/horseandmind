# Go-live plan: from staging to the shared hosting

Status 13 Nov 2026. The old WordPress site stays online and untouched until step 4.

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

## 2. Prepare the hosting

What we need to find out first (the old site runs on Apache with PHP 8.3; the provider is still unknown):
- Which provider and panel (cPanel, Plesk, own panel)? Login for you, FTP/FTPS access for the deploy.
- Can the panel change a domain's **document root** (the folder a domain points to)? This decides the switch method in step 4.

Then:
1. Create the subdomain **staging.horseandmind.ch** with its own folder, e.g. `/staging/`. Turn on HTTPS (Let's Encrypt in the panel) and, if the panel offers it, password protection for the folder.
2. In GitHub (Settings → Secrets and variables → Actions):
   - Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_DIR` = `/staging/` (with trailing slash, path as the FTP account sees it).
   - Variable: `SITE_ENV` = `staging`.
3. In `site.json` set `apiBase` to `""` so the forms send to Zoho (the demo backend is only for previews). Claude does this.
4. Merge the branch into `main` → the deploy workflow builds and uploads. Claude checks the run log.

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

Pick a quiet weekday morning, not during a camp sign-up rush. About one hour.

1. **Back up WordPress**: full file download (FTP or the panel's backup) **and** a database export (phpMyAdmin → Export). Keep both for at least 3 months.
2. Upload the new site to a **new folder**, e.g. `/new/`: set `FTP_DIR` = `/new/`, `SITE_ENV` = `production` → run the deploy (production build refuses the demo backend, so the forms go to Zoho).
3. Switch, depending on the panel:
   - **A – document root can be changed (preferred):** point horseandmind.ch from the WordPress folder to `/new/`. Takes effect in minutes; WordPress stays untouched next to it.
   - **B – document root is fixed:** move the WordPress files into a subfolder `/wp-old/` (or delete them after the backup) and upload the new site into the root folder. Make sure WordPress's own `.htaccess` is replaced by ours. A few minutes of downtime.
4. **Smoke test right after** (Claude): home, Kids, camp page, booking page, one form → Zoho, redirect test against the live domain, `robots.txt` allows crawling, no `noindex` anywhere, cookie banner appears and Analytics loads after «Akzeptieren».
5. **Google Search Console** (needs your Google account): verify the domain, submit `https://horseandmind.ch/sitemap.xml`, request indexing of the homepage. Same in Bing Webmaster Tools.
6. Update `FTP_DIR` in GitHub to the live folder for all future deploys.

### Rollback

- Method A: point the document root back to the WordPress folder – minutes.
- Method B: move `/wp-old/` back (or restore the backup) – 15–30 minutes.
- Either way the old site comes back exactly as before; Zoho keeps every lead it received.

## 5. Aftercare (4 weeks)

- Week 1: daily look at Search Console (404s, redirect errors) and at Zoho (new leads arriving).
- Weeks 2–4: weekly; fix any missing redirect within a day.
- Google Business Profile: address Hegifeldstrasse 6B, link to the new site.
- After 3 months without problems: delete the WordPress files and database, cancel plugin licenses (Bookly, Uncode updates), keep the backup archive.

## Later, independent of the go-live

Own booking backend (Supabase, Frankfurt) + Google Calendar + emails, then the Zoho import (field meaning in `docs/old-site.md`). The website's forms switch from Zoho to the backend by changing `apiBase` – no page changes.

## What Claude needs from you

1. GitHub Pro (or tell me to use another free preview) and the two one-time Pages settings above.
2. Name of the hosting provider and whether the document root can be changed.
3. The staging subdomain + the 4 FTP secrets and `SITE_ENV` in GitHub.
4. Manuela's corrections and sign-off; a date for the switch.
5. Access to Google Search Console (or do steps 5 yourself with the guide above).
