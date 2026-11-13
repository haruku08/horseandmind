# Old site inventory (crawl of 13 Nov 2026)

Source: horseandmind.ch (WordPress 7.1.4, PHP 8.3, Apache), read via the public pages, the WordPress REST API and the Rank Math sitemap.

## Software and services

| What | Old site | New site |
|---|---|---|
| CMS / theme | WordPress 7.1.4, theme **Uncode** (page builder) | static HTML (`build.mjs`) |
| SEO | Rank Math (`/sitemap_index.xml`) | own `sitemap.xml`, schema.org, `llms.txt` |
| Forms | **Zoho CRM webforms** (EU data centre, `crm.zoho.eu`) on the `/buchung/…` pages; Contact Form 7 installed but unused on the pages read | Zoho bridge in `site.js` (same keys and fields), later own backend |
| Booking | Bookly pages under `/buchung/` (now static info + Zoho form), Calendly `manuela-pattynama/30min` | slot picker (demo), Calendly fallback |
| Analytics | Google Analytics 4 `G-RY5BHSBLTG` | same property, only after consent, production only |
| Cookie banner | Uncode Privacy | own small banner (`site.js`) |
| Shop | Simple PayPal Shopping Cart plugin installed; shop link to Spreadshirt | Spreadshirt link |
| Fonts | Lora, Open Sans, Fraunces, Manrope (Google Fonts) | Ubuntu, Fraunces, Plus Jakarta Sans (self-hosted) |
| Maps | Google Maps (embed + route links) | route links only |

## Zoho webform (copied into `site.json` → `zoho`)

- Action `https://crm.zoho.eu/crm/WebToLeadForm`, hidden keys `xnQsjsdp`, `xmIwtLD`, `actionType=TGVhZHM=` (Leads), `zc_gad` empty. The keys are public (page source).
- Old return URL `/buchung/danke/?booking=…` – now `/danke/` (old URL redirects).
- **How Manuela uses the fields** (important for the Zoho CSV import later):

| Zoho field | Meaning |
|---|---|
| Lead Source | offer: `Web: Pferdegestütztes Coaching`, `Web: Reitpädagogik`, `Web: Kids Mini Camp`, `Web: KKP`, `Web: Wing Wave` |
| Lead Status | `Mini-Camp` for camp sign-ups |
| Fax | camp date or group, e.g. `Land der Gefühle 05.-08.10.26`, `WARTELISTE Land der Gefühle 13.-16.07.26`, `Warteliste Mittwoch Gr1: 13.30 - 15.00` |
| Twitter | name of the child |
| Annual Revenue | in the forms, but unused / hidden |
| Salutation | Herr / Frau / Familie |
| Description | message ("Mitteilung") |
| First/Last Name, Email, Mobile, Street, Zip Code, City | as named |

## Facts taken over

- Reitpädagogik: Wednesday, group 1 13.30–15.00, group 2 15.00–16.30 (90 min), groups of 4, both on a waitlist (Aug 2025). Old price CHF 45 per lesson (booking pages 2020–22, not on the current page).
- 1:1 coaching kids & teens: **ab CHF 110 pro Stunde** (current page); 60-min session.
- Adults: no current price (archived page 2021: ab CHF 140 pro Stunde – not used).
- Leadership & Team / Teams & Familien: **Preis nach Absprache**.
- Camp «Land der Gefühle»: CHF 360; older spring/autumn mini camps CHF 280 (2023).
- First 30 phone minutes free (Calendly 30 min); steps on the old site: 15 min Kennenlerngespräch, 45 min Beratungsgespräch.
- AGB (Oct 2023) taken over word for word (cancellation 24 h for coachings; camps/workshops/team: 14 days → 50 %, 7 days → 100 %).
- Partners with links: Biohof Binzenloo, Kinderthur, Schweizer Verband Pferdeunterstütztes Coaching, People Kids Coach, Anais Zimmermann.
- Horses: page «Unsere Pferde» is empty; known horse: **Starlett** (photo set «Jona_Amy_Bella_Starlett» – the others are people).
- Team: the old «Über uns» also presents Rahel Deloof – left out on the owner's decision.
- No Impressum page on the old site (404).

## Photos

225 media items. Used now (web versions, max. 1920 px, until the originals arrive): shoot **30.09.2022** (Manuela with the horses), **21.09.2023** (Manuela, river/meadow), **2020** headers (kids, Reitpädagogik, mini camp) and the 2023 homepage hero. Mapping slot → file: see `src/data/photos.json` and the commit «Crawl old site».

## Old URLs

All 54 pages of the old sitemap plus older addresses from Google either exist on the new site or redirect (`src/static/.htaccess`, tested 13 Nov 2026). Archived offers (Life Coaching, Trauma Workshop, Wieherndes Klassenzimmer, Workshop «Ich mag mich so wie ich bin», Epigenetik-Stress-Workshop) redirect to the closest current page.
