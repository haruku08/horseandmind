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

**Colors, corners, fonts** – all set as variables at the top of `src/assets/css/site.css`.

## Images

All photos are placeholders for now (`{{ph:Label}}` in the pages). To put a real photo in:

1. Save it in `src/assets/img/` – export as JPG or WebP, max. 2000 px wide, ideally under 300 KB.
2. Replace the placeholder, e.g. `{{ph:Kinder mit Pferden|tall}}`, with:

```html
<figure class="photo"><img src="/assets/img/kinder-pferde.jpg" alt="Kinder führen ein Pferd über die Wiese" width="1600" height="1200" loading="lazy"></figure>
```

Use `loading="lazy"` everywhere except the hero image on the homepage. Also add `src/assets/img/og-image.jpg` (1200 × 630) – it's the preview picture when the site is shared on WhatsApp or Facebook.

## Forms and booking

Three forms send their data as JSON to the booking API set in `src/data/site.json` → `apiBase`:

| Form | Page | Endpoint |
|---|---|---|
| Camp sign-up | `/buchung/land-der-gefuehle/` | `POST {apiBase}/bookings/camp` |
| 1:1 appointment | `/termin/` | `GET {apiBase}/slots?service=…&days=21`, `POST {apiBase}/bookings/appointment` |
| Contact | `/kontakt/` | `POST {apiBase}/contact` |

While `apiBase` is empty, forms show a "Testversion – nicht verbunden" notice and send nothing, and the appointment page links to the existing Calendly. Each form has a hidden spam trap (`company` field) and a `source` field (`web:kids-camp`, `web:termin`, `web:kontakt`).

The slots endpoint answers with `{ "days": [ { "date": "2026-11-02", "slots": ["09:00", "10:30"] } ] }`.

## Deploying

1. Create a subdomain `staging.horseandmind.ch` in the hosting control panel, pointing to its own folder (e.g. `/staging/`). Protect it with a password there so Google doesn't index it.
2. In GitHub → Settings → Secrets and variables → Actions, add `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` and `FTP_DIR` (the staging folder, ending in `/`).
3. Push to `main` – the site appears on the staging subdomain.
4. Going live: back up the WordPress folder and database, then change `FTP_DIR` to the main web folder and run the workflow again. The `.htaccess` redirects the old WordPress URLs.

If your host only offers plain FTP, change `protocol: ftps` to `ftp` in the workflow.

## Before go-live

- [ ] Real photos in place, og-image added
- [ ] Texts from the old pages carried over (pages marked "Inhalt folgt")
- [ ] Impressum, Datenschutz and AGB completed and checked
- [ ] Self-host the fonts instead of loading them from Google (recommended under Swiss/EU data protection). Download Cormorant Garamond and Mulish as WOFF2, put them in `src/assets/fonts/`, replace the Google `<link>` in `layout.html` with `@font-face` rules in `site.css`.
- [ ] Booking API connected (`apiBase`), test bookings for camp, appointment and contact
- [ ] Upcoming camp dates entered in `camps.json`
