# Google setup and AI search – concept

As of 15 Nov 2026. Goal: when someone asks Google, ChatGPT, Gemini, Perplexity or Copilot *«Pferdegestütztes Coaching Winterthur»*, *«Reitpädagogik für Kinder Zürich»* or *«Wer ist Manuela Pattynama?»*, Horse & Mind is named – with the right address, offers and a link to book.

---

## 1. Search Console – why it seems gone and how to get it back

**What we found (15 Nov 2026):** the old WordPress site still has a Search Console verification tag in its page head, inserted by the Rank Math plugin:

```
<meta name="google-site-verification" content="vMr92tYMNANsjnLDJUsPRr_3A03DIuFVyOK3flA6IU">
```

So a Search Console property for horseandmind.ch **does exist and is verified** – just not under the Google account you are logged into now. Likely causes: it was set up with a different Google account (an old Gmail, the web designer's account, or the account connected inside Rank Math), or you were a «user» on someone else's property and were removed.

**Recommended fix (10 minutes, permanent):**

1. In Search Console with *your* Google account: «Property hinzufügen» → **Domain** (not «URL-Präfix») → `horseandmind.ch`.
2. Google shows a TXT record `google-site-verification=…`. In cPanel at unaxus → **Zone Editor** → horseandmind.ch → «+ TXT Record», name `horseandmind.ch.`, value = the text from Google. Save.
3. Back in Search Console → «Bestätigen» (DNS can take up to an hour).

Why the Domain property: it covers `https://`, `http://`, `www.` and `staging.` at once, and it **does not depend on the website** – it keeps working through the switch from WordPress to the new site and any future redesign. The old meta-tag verification would break the day WordPress is moved away.

**Quick alternative today:** «URL-Präfix» `https://horseandmind.ch/` → method «Google Analytics». Works immediately because the old site loads the GA tag on every page, *if* your account has «Bearbeiten» rights on the GA property. Downside: the new site loads Analytics only after cookie consent, so this method fails after go-live. Use it only as a bridge, then add the DNS record.

**Already done in the repo:** the old token is copied into the new site (`site.json → searchConsole.verification`, production builds only), so whoever owns the existing property stays verified after the switch and its history (queries, clicks since years) isn't cut off. Once you have your own Domain property, also try to find the old owner (Search Console → «Einstellungen» → «Nutzer und Berechtigungen» shows owners once you're verified) – the existing property holds the older data.

**After verifying:**

- «Sitemaps» → submit `https://horseandmind.ch/sitemap.xml` (the old Rank Math sitemap `/sitemap_index.xml` disappears at go-live – remove it then).
- «Einstellungen» → «Nutzer und Berechtigungen»: add a second owner (backup account), and Claude/the developer as «Vollständig» if wanted.
- After go-live: «Seiten» (indexing report) and «Weiterleitungen» weekly for 4 weeks – see `docs/go-live-plan.md`.

## 2. Google Analytics – what to set up

The new site keeps the same GA4 stream as the old one (`G-RY5BHSBLTG`, loaded only after consent, live site only). Check that it belongs to the property in your link (account 106959603, property 353240500): GA → Verwaltung → Datenstreams → the Measurement ID must be `G-RY5BHSBLTG`. If not, tell us the right ID – one line in `site.json`.

Then three settings:

1. **Link Search Console:** GA → Verwaltung → Produktverknüpfungen → Search Console-Verknüpfungen → the new Domain property. GA then shows the Google search queries next to visits.
2. **Make AI assistants visible as a channel:** GA → Verwaltung → Datenanzeige → Channelgruppen → copy the default group → new channel «KI-Assistenten» *above* «Referral», condition «Quelle» matches regex
   `chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|you\.com|poe\.com|meta\.ai|mistral\.ai`
   Visits from ChatGPT, Perplexity etc. then show as their own line instead of hiding in «Referral».
3. **Key events (Schlüsselereignisse):** mark the thank-you page (`page_view` on `/danke/`) as «Anfrage gesendet» so you see which channel brings enquiries, not just visits.

Keep in mind: with the consent banner, typically only 40–60 % of visitors are counted. Use GA for **trends and channel mix**, not absolute numbers. And AI answers often *replace* the click (the person reads the answer and calls or emails directly) – so the real AI measure is section 5, not GA alone.

## 3. How AI search finds a business

| Assistant | Where its answers come from |
|---|---|
| Google AI Overviews / AI Mode, Gemini | Google's search index + **Google Business Profile** + Maps reviews |
| ChatGPT search | its own crawler (OAI-SearchBot) + **Bing's index** + licensed data |
| Microsoft Copilot | **Bing** index + Bing Places |
| Perplexity | own crawler + Bing/Google results |
| Claude | own crawler (Claude-SearchBot) + web search |

Three consequences:

1. **Google and Bing must both know the site well.** Bing is under-rated: it feeds ChatGPT and Copilot. → Bing Webmaster Tools is as important as Search Console.
2. **The business must be a clear «entity»:** the same name, address, owner and offers on the website, Google Business Profile, Bing Places, Swiss directories, Instagram and Facebook. Assistants trust facts they find repeated in several independent places. Today «Manuela Pattynama Horse & Mind» finds almost nothing – that is the main gap.
3. **The site must answer the questions people ask, in plain sentences** that can be quoted on their own («Pferdegestütztes Coaching ist … Bei Horse & Mind in Winterthur …»), with facts: who, where, for whom, how it works, what it costs, how to book.

## 4. What the new site already does

- Static HTML, fast, readable without JavaScript – every crawler sees the full text.
- schema.org on every page: LocalBusiness (address, area, topics, Instagram/Facebook), Person «Manuela Pattynama» on /ueber-uns/, BreadcrumbList, FAQPage from the FAQ blocks, Event per upcoming camp with price and availability.
- `llms.txt` – a plain-text summary of the business and all pages for AI assistants.
- `sitemap.xml` with real change dates; all 54 old URLs redirect (no lost signals).
- `robots.txt` allows all crawlers, including the AI search bots.
- One page per offer with a descriptive title («Reitpädagogik für Kinder ab 5 Jahren in Winterthur»).

## 5. Plan – what to do, in order

### A. Foundations (this month, mostly Manuela, ~2 hours total)

| # | What | Who | Why |
|---|---|---|---|
| A1 | Search Console Domain property via DNS (section 1) | Manuela | see what Google sees |
| A2 | **Bing Webmaster Tools** → «Import from Google Search Console» (one click once A1 is done) → send us the `msvalidate.01` code only if import fails (`site.json → bingVerification`) | Manuela | Bing feeds ChatGPT and Copilot |
| A3 | **Google Business Profile**: claim/create «Horse & Mind», category «Coach» (+ «Reitpädagogik»/«Lebensberater» if offered), address Hegifeldstrasse 6B, website, opening = «nach Vereinbarung», 10+ photos, the offers as «Dienstleistungen» | Manuela | the #1 source for local AI answers and Maps |
| A4 | **Bing Places** – import from the Google profile | Manuela | Copilot / ChatGPT local answers |
| A5 | GA settings (section 2) | Manuela or us with GA access | measure |

### B. Entity and consistency (next 4–6 weeks)

| # | What | Who |
|---|---|---|
| B1 | Same name/address/website on **local.ch, search.ch, Moneyhouse** (company entry with UID CHE-419.735.904 – check it matches), Instagram + Facebook bios with link to horseandmind.ch | Manuela |
| B2 | Professional listings where they exist (e.g. wingwave coach directory, associations for pferdegestützte Intervention / Reitpädagogik, Epigenetik training provider) with link to the site | Manuela – send us the list |
| B3 | Partner pages (partners from the old site, Binzenloo / stable) link to horseandmind.ch with the full name | Manuela asks |
| B4 | Enrich the Person schema on /ueber-uns/: portrait photo, education/certificates, LinkedIn profile if one exists | us, facts from Manuela |
| B5 | **Reviews:** ask happy parents/clients for a Google review (a short link from the Business Profile, e.g. in the thank-you email after a camp). Reviews with words like «Reitpädagogik», «Camp», «mein Sohn» are quoted by AI | Manuela, ongoing |

### C. Content that AI can quote (next 2–3 months)

| # | What |
|---|---|
| C1 | One clear **definition paragraph** at the top of /pferdeunterstuetztes-coaching/: «Pferdegestütztes Coaching ist … Bei Horse & Mind arbeitet Manuela Pattynama in Winterthur mit …» – 2–3 sentences that stand on their own. |
| C2 | **FAQ per offer** with the questions parents and adults actually ask (we draft, Manuela corrects): Brauche ich Reiterfahrung? Ab welchem Alter? Hilft es bei ADHS? Wie läuft eine Stunde ab? Was kostet es? Wo genau? Was bei Regen? – each answer 2–4 sentences with a concrete fact. Becomes FAQPage schema automatically. |
| C3 | **Prices:** AI assistants are very often asked «Was kostet …?». Where there is a price (kids 1:1 ab CHF 110/h, camp CHF 360) it's on the page. For Coaching/Wingwave/Ruhe im Chaos («auf Anfrage», owner's decision) consider at least a range («ab CHF …») – otherwise assistants say «keine Preisangabe» or guess. Owner's call. |
| C4 | **Camp dates for 2027** in `camps.json` as early as possible – each date becomes an Event in Google and a line in `llms.txt`. Empty camp lists are the most common reason an AI says «no current offers». |
| C5 | 3–4 **articles** answering bigger questions in Manuela's voice, one per quarter, e.g. «Warum Pferde Kindern mit ADHS helfen können», «Was passiert in einem Kids Camp?», «Wingwave: wie es funktioniert». Real experience, own photos – AI prefers first-hand content over generic text. |
| C6 | Optional: an English summary page («Equine-assisted coaching in Winterthur») – expats around Zürich ask assistants in English. |

### D. Technical (small, we do it)

- Done 15 Nov 2026: old Search Console token carried over; `msvalidate.01` slot ready; cookies page moved to «Rechtliches» in `llms.txt`.
- At go-live: submit sitemap in Google + Bing; **IndexNow** ping to Bing after each deploy (one request in the deploy workflow, no account needed beyond Bing Webmaster Tools) – new camp dates reach Bing/ChatGPT in hours instead of weeks.
- Decide AI **training** crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot): currently allowed, like everything. They don't affect *search* answers (those use OAI-SearchBot, Claude-SearchBot, Googlebot), but allowing them helps assistants «know» Horse & Mind without searching. Recommendation for a small local business: **keep allowing**. Say so if you prefer to block them – one block in `robots.txt`.

## 6. Measuring AI visibility

GA shows only the clicks. Once a month (15 minutes, can be a scheduled task for Claude) ask the same questions in ChatGPT, Gemini / Google AI Mode, Perplexity and Copilot and note: is Horse & Mind named? Correct address? Link? Competitors named instead?

Fixed question set:

1. Pferdegestütztes Coaching in Winterthur – wer bietet das an?
2. Reitpädagogik für Kinder in der Region Winterthur
3. Ferienangebot / Camp mit Pferden für Kinder bei Winterthur
4. Coaching für Eltern von Kindern mit ADHS in der Nähe von Zürich
5. Wingwave Coach Winterthur
6. Wer ist Manuela Pattynama?
7. Was kostet ein Kids Camp bei Horse & Mind?

Plus in Search Console: impressions for «pferdegestütztes coaching», «reitpädagogik winterthur», «horse and mind» month over month, and in GA the «KI-Assistenten» channel and enquiries (`/danke/`).

**Target after 6 months:** named for questions 1, 2, 3 and 6 in at least 3 of 4 assistants, with correct address.

## 7. What we need from Manuela

1. Do A1–A4 (or give us «Vollständig» access to Search Console and Business Profile and we do the rest).
2. Check in GA that `G-RY5BHSBLTG` is the stream of the property you linked.
3. List of certificates/trainings and professional directories (B2, B4), LinkedIn if any.
4. Decision on price ranges (C3) and AI training crawlers (D).
5. Camp dates 2027 (C4).
