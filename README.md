# Horse & Mind – Website

Static website for [horseandmind.ch](https://horseandmind.ch): plain HTML and CSS, built by a small script with no dependencies, uploaded to the hosting via FTP.

## How it works

```
src/
  layout.html            shared frame: header, navigation, footer
  pages/                 one folder per page – the folder path is the URL
    index.html           → /
    kids/land-der-gefuehle/index.html  → /kids/land-der-gefuehle/
  data/
    camps.json           camp dates – the file you'll edit most
    site.json            site settings (booking API address, services)
  assets/                CSS, JavaScript, images
  static/                copied to the site root (.htaccess, robots.txt)
build.mjs                turns src/ into the finished site in dist/
```

Build and preview locally (needs Node 18+ and Python):

```
npm run preview          # then open http://localhost:8080
```

Every push to `main` on GitHub builds the site and uploads it automatically (`.github/workflows/deploy.yml`).

## Everyday changes

**Add or change camp dates** – edit `src/data/camps.json`, one entry per camp:

```json
{
  "id": "ldg-2027-04",
  "camp": "land-der-gefuehle",
  "title": "Das Land der Gefühle",
  "start": "2027-04-19",
  "end": "2027-04-22",
  "season": "Frühlingsferien",
  "time": "09.00–12.00",
  "price": 360,
  "status": "auto",
  "seatsLeft": 6
}
```

- `status`: `auto` (open), `waitlist` or `full`. With `seatsLeft` 3 or fewer the chip says "Noch 3 Plätze frei".
- Past camps disappear by themselves, on the camp page, the homepage and in the booking form.
- With no upcoming dates, the camp page shows "Neue Daten folgen bald" with an "Interesse melden" button.

**Text** – edit the page's `index.html` in `src/pages/…`. Header and footer live once in `src/layout.html`.

**Colors, corners, fonts** – all set as variables at the top of `src/assets/css/site.css` (CRM: `admin.css`). Fonts: Eczar (titles) and Plus Jakarta Sans (text), self-hosted in `src/assets/fonts/`.

## Images

Every photo spot shows a placeholder until its photo exists. To add one:

1. Export it as JPG or WebP, max. 2000 px wide, ideally under 300 KB.
2. Name it after the placeholder label and put it in `src/assets/img/photos/`:
   `hero-herbst-2023`, `manuela-portrait`, `coaching`, `coaching-erwachsene`, `erwachsene`, `kids-einzelbegleitung`, `kind-mit-pferd`, `kinder-mit-pferden`, `kids-camp`, `reitpaedagogik`, `wingwave`, `epigenetik`, `binzenloo` (e.g. `binzenloo.jpg`).
3. Adjust its alt text in `src/data/photos.json` so it describes what the photo shows.

The build lists every slot that is still empty. `src/assets/img/og-image.jpg` (1200 × 630) is the preview picture on WhatsApp and Facebook – a text-only version for now; swap in a photo version later.

## Missing facts

Unknown facts (prices, durations, legal details) are written as `[IN GROSSBUCHSTABEN]` in the pages. They show highlighted on the site, and the build lists them all. Replace each before go-live.

## Staging and production

The deploy needs the repository variable `SITE_ENV` (Settings → Secrets and variables → Actions → Variables):

- `staging` – every page is `noindex`, `robots.txt` blocks all crawlers. Use while `FTP_DIR` points to the staging folder.
- `production` – set together with `FTP_DIR` = live folder at go-live.

Without it the deploy stops. Local builds default to non-production (`SITE_ENV=production node build.mjs` to test the live version).

## Demo: booking tool and CRM

With `site.json` → `apiBase: "mock"` the site runs a **demo backend in the browser** (`src/assets/js/mock-api.js`):

- Camp sign-up, appointment slot picker and contact form work end to end.
- The CRM is at **`/admin/`**: Anfragen (inbox with status Neu → Kontaktiert → Gebucht → Bezahlt → Abgeschlossen, or Abgesagt; notes; call/email buttons), Termine (upcoming appointments, opening hours and blocked days that drive the free slots), Camps (seats, participants with health notes, waitlist, CSV), Kontakte (search, children, history, CSV).
- Data is stored only in the browser that made it (localStorage) and starts with example records. "Zurücksetzen" in the CRM restores them.
- Example camp dates come from `src/data/camps.mock.json`. Durations other than the Erstgespräch are examples (60 min).
- A banner on every page says it is a demo. A production build refuses to run with `apiBase: "mock"`.

The data model (contacts, children, bookings with flexible `details`, notes, availability) matches the planned database, so the real backend replaces `mock-api.js` without changing the pages.

## Forms and booking

Three forms send their data as JSON to the booking API set in `src/data/site.json` → `apiBase`:

| Form | Page | Endpoint |
|---|---|---|
| Camp sign-up | `/buchung/land-der-gefuehle/` | `POST {apiBase}/bookings/camp` |
| 1:1 appointment | `/termin/` | `GET {apiBase}/slots?service=…&days=21`, `POST {apiBase}/bookings/appointment` |
| Contact | `/kontakt/` | `POST {apiBase}/contact` |

While `apiBase` is empty, the contact and camp forms post to the **Zoho CRM webform**, configured in `site.json` → `zoho` (copy `action` and the hidden inputs `xnQsjsdp`, `xmIwtLD`, `actionType` … from the old site's form HTML). Name, email, phone and address go to Zoho's fields; everything else (camp date, children, consents, message) goes into `Description`. Zoho then sends the visitor to `/danke/`. With no `action` set, a form tells the visitor to write to info@horseandmind.ch. The appointment page links to Calendly. Each form has a hidden spam trap (`company` field) and a `source` field (`web:kids-camp`, `web:termin`, `web:kontakt`).

The slots endpoint answers with `{ "days": [ { "date": "2026-11-02", "slots": ["09:00", "10:30"] } ] }`.

## Deploying

1. Create a subdomain `staging.horseandmind.ch` in the hosting control panel, pointing to its own folder (e.g. `/staging/`). Protect it with a password there so Google doesn't index it.
2. In GitHub → Settings → Secrets and variables → Actions, add `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` and `FTP_DIR` (the staging folder, ending in `/`).
3. Push to `main` – the site appears on the staging subdomain.
4. Going live: back up the WordPress folder and database, then change `FTP_DIR` to the main web folder and run the workflow again. The `.htaccess` redirects the old WordPress URLs.

If your host only offers plain FTP, change `protocol: ftps` to `ftp` in the workflow.

## Before go-live

- [ ] Real photos in place (build lists empty slots); photo version of `og-image.jpg`
- [ ] All `[PLACEHOLDER]` facts and "Inhalt folgt" boxes resolved (build lists them)
- [ ] Impressum, Datenschutz and AGB completed and legally checked
- [x] Fonts self-hosted (`src/assets/fonts/`)
- [ ] Zoho webform keys in `site.json` → `zoho`; test a contact and a camp sign-up end to end
- [ ] Upcoming camp dates entered in `camps.json`
- [ ] `SITE_ENV=production` and `FTP_DIR` = live folder; back up WordPress first
- [ ] After go-live: test old URLs (see `.htaccess`), Google Search Console + Bing, submit sitemap
