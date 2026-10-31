/* Horse & Mind – CRM (/admin/). Reads and writes through window.HMMock.crm for now;
   the same functions will later call the real backend. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var M = window.HMMock && window.HMMock.crm;
  var CFG = window.HM_CONFIG || {};

  if (!M) {
    app.innerHTML = '<div class="a-empty"><h1>CRM noch nicht verbunden</h1><p>Das CRM läuft im Moment nur im Demo-Modus (site.json → apiBase "mock").</p></div>';
    return;
  }

  /* ---------- helpers ---------- */
  var ICON = {
    back: '<path d="M15 18 9 12l6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'
  };
  function icon(name) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
  function dayDiff(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function fmtDay(iso) {
    var d = new Date(iso + 'T12:00:00Z'), diff = dayDiff(iso, M.today());
    var rel = diff === 0 ? 'Heute' : diff === 1 ? 'Morgen' : diff === -1 ? 'Gestern' : null;
    var abs = WD[d.getUTCDay()] + ', ' + d.getUTCDate() + '. ' + MON[d.getUTCMonth()];
    return rel ? rel + ', ' + d.getUTCDate() + '. ' + MON[d.getUTCMonth()] : abs;
  }
  // "heute 08:12", "gestern", "vor 4 Tagen", "12. Okt."
  function fmtAgo(stamp) {
    var day = stamp.slice(0, 10), diff = dayDiff(M.today(), day);
    if (diff === 0) return 'heute ' + stamp.slice(11, 16);
    if (diff === 1) return 'gestern';
    if (diff < 7) return 'vor ' + diff + ' Tagen';
    var d = new Date(day + 'T12:00:00Z');
    return d.getUTCDate() + '. ' + MON[d.getUTCMonth()];
  }
  function addMin(hhmm, min) {
    var t = +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5) + min;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  function fullName(c) { return c ? (c.firstName + ' ' + c.lastName).trim() : 'Unbekannt'; }

  var STATUS_LABEL = { neu: 'Neu', kontaktiert: 'Kontaktiert', gebucht: 'Gebucht', bezahlt: 'Bezahlt', abgeschlossen: 'Abgeschlossen', abgesagt: 'Abgesagt' };
  var PIPELINE = ['neu', 'kontaktiert', 'gebucht', 'bezahlt', 'abgeschlossen'];
  var KIND_LABEL = { camp: 'Camp', interest: 'Camp-Interesse', appointment: 'Termin', contact: 'Nachricht' };
  var INTEREST_LABEL = { coaching: 'Coaching für Erwachsene', kids: 'Begleitung für Kinder', camp: 'Kids Camp', reitpaedagogik: 'Reitpädagogik', wingwave: 'Wingwave', epigenetik: 'Epigenetik', anderes: 'Etwas anderes' };
  function pill(status) { return '<span class="pill pill--' + status + '">' + STATUS_LABEL[status] + '</span>'; }

  function summary(b) {
    var kids = (b.childIds || []).length;
    var kidsText = kids === 1 ? '1 Kind' : kids + ' Kinder';
    if (b.kind === 'camp') {
      var c = M.camp(b.campId);
      return (c ? c.label : 'Camp') + ' · ' + kidsText + (b.waitlist ? ' · Warteliste' : '');
    }
    if (b.kind === 'interest') return 'Interesse am nächsten Camp · ' + kidsText;
    if (b.kind === 'appointment') return M.serviceLabel(b.service) + ' · ' + fmtDay(b.start.slice(0, 10)) + ', ' + b.start.slice(11);
    var interest = b.details && INTEREST_LABEL[b.details.interest];
    return interest ? 'Nachricht · ' + interest : 'Nachricht';
  }

  function row(b, opts) {
    var c = M.contact(b.contactId);
    return '<a class="row' + (b.status === 'neu' ? ' row--new' : '') + '" href="#anfrage/' + esc(b.id) + '">' +
      '<span class="row-main"><strong>' + esc(opts && opts.title ? opts.title : fullName(c)) + '</strong><span>' + esc(summary(b)) + '</span></span>' +
      '<span class="row-side"><span class="a-muted">' + fmtAgo(b.createdAt) + '</span>' + pill(b.status) + '</span></a>';
  }

  function downloadCSV(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (v) {
        v = String(v == null ? '' : v);
        return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(';');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function header(title, opts) {
    opts = opts || {};
    return '<header class="v-head">' +
      (opts.back ? '<a class="v-back" href="' + opts.back[0] + '">' + icon('back') + esc(opts.back[1]) + '</a>' : '') +
      '<div class="v-title"><h1 tabindex="-1">' + esc(title) + '</h1>' + (opts.action || '') + '</div>' +
      (opts.sub ? '<p class="a-muted">' + opts.sub + '</p>' : '') + '</header>';
  }

  /* ---------- views ---------- */
  var inboxFilter = null;
  var FILTERS = [
    ['offen', 'Offen', function (b) { return b.status !== 'abgeschlossen' && b.status !== 'abgesagt'; }],
    ['neu', 'Neu', function (b) { return b.status === 'neu'; }],
    ['kontaktiert', 'Kontaktiert', function (b) { return b.status === 'kontaktiert'; }],
    ['gebucht', 'Gebucht', function (b) { return b.status === 'gebucht'; }],
    ['bezahlt', 'Bezahlt', function (b) { return b.status === 'bezahlt'; }],
    ['erledigt', 'Erledigt', function (b) { return b.status === 'abgeschlossen' || b.status === 'abgesagt'; }]
  ];

  function viewInbox() {
    // reverse first: entries from the same minute keep newest-first order (sort is stable)
    var all = M.data().bookings.slice().reverse().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    var current = FILTERS.filter(function (f) { return f[0] === inboxFilter; })[0] || FILTERS[0];
    var list = all.filter(current[2]);
    var chips = FILTERS.map(function (f) {
      var n = all.filter(f[2]).length;
      return '<button type="button" class="chip" data-filter="' + f[0] + '" aria-pressed="' + (f === current) + '">' + f[1] + ' <span>' + n + '</span></button>';
    }).join('');
    return header('Anfragen') +
      '<div class="chips" role="group" aria-label="Filter">' + chips + '</div>' +
      (list.length ? '<div class="list">' + list.map(function (b) { return row(b); }).join('') + '</div>'
        : '<p class="a-empty-line">Keine Anfragen in dieser Ansicht.</p>');
  }

  function viewBooking(id) {
    var b = M.booking(id);
    if (!b) return header('Nicht gefunden', { back: ['#anfragen', 'Anfragen'] });
    var c = M.contact(b.contactId) || {};
    var html = header(fullName(c), {
      back: ['#anfragen', 'Anfragen'],
      sub: esc(KIND_LABEL[b.kind]) + ' · eingegangen ' + fmtAgo(b.createdAt) + ' · <a href="#kontakt/' + esc(c.id) + '">Kontakt</a>'
    });

    // Status
    var cancelled = b.status === 'abgesagt';
    html += '<section class="card"><h2>Status</h2>' +
      (cancelled ? '<p>' + pill('abgesagt') + '</p><button type="button" class="btn-text" data-action="status" data-status="neu">Wieder öffnen</button>'
        : '<div class="steps" role="group" aria-label="Status">' + PIPELINE.map(function (s) {
          return '<button type="button" data-action="status" data-status="' + s + '" aria-pressed="' + (b.status === s) + '">' + STATUS_LABEL[s] + '</button>';
        }).join('') + '</div><button type="button" class="btn-text btn-text--danger" data-action="status" data-status="abgesagt">Absagen</button>') +
      '</section>';

    // Contact actions
    var subject = encodeURIComponent('Horse & Mind – ' + KIND_LABEL[b.kind]);
    html += '<div class="actions">' +
      (c.phone ? '<a class="btn" href="tel:' + esc(c.phone.replace(/\s/g, '')) + '">' + icon('phone') + 'Anrufen</a>' : '') +
      '<a class="btn btn--ghost" href="mailto:' + esc(c.email) + '?subject=' + subject + '">' + icon('mail') + 'E-Mail</a></div>';

    // Request details
    var dl = [];
    if (b.kind === 'camp' || b.kind === 'interest') {
      var camp = M.camp(b.campId);
      dl.push(['Camp', camp ? esc(camp.title) + '<br><span class="a-muted">' + esc(camp.label) + ' · ' + esc(camp.time) + '</span>' : 'Nächstes Camp (noch kein Datum)']);
      dl.push(['Kinder', (b.childIds || []).map(function (kid) {
        var k = M.child(kid);
        if (!k) return '';
        return '<div class="kid"><strong>' + esc(k.name) + '</strong>' + (k.age ? ', ' + esc(k.age) + ' Jahre' : '') +
          (k.notes ? '<div class="note-warn">' + icon('alert') + esc(k.notes) + '</div>' : '') + '</div>';
      }).join('')]);
      if (b.kind === 'camp') {
        dl.push(['Platz', b.waitlist
          ? 'Warteliste <button type="button" class="btn-text" data-action="waitlist" data-value="0">Platz geben</button>'
          : 'Bestätigt <button type="button" class="btn-text" data-action="waitlist" data-value="1">Auf Warteliste</button>']);
      }
    }
    if (b.kind === 'appointment') {
      var dur = M.minutesOf(b.service);
      dl.push(['Angebot', esc(M.serviceLabel(b.service))]);
      dl.push(['Termin', esc(fmtDay(b.start.slice(0, 10))) + ', ' + esc(b.start.slice(11)) + '–' + esc(addMin(b.start.slice(11), dur))]);
    }
    if (b.kind === 'contact' && b.details && b.details.interest) dl.push(['Interesse', esc(INTEREST_LABEL[b.details.interest] || b.details.interest)]);
    if (b.message) dl.push(['Nachricht', '<p class="msg">' + nl2br(b.message) + '</p>']);
    var d = b.details || {};
    var consent = [d.agb ? 'AGB' : '', d.privacy ? 'Datenschutz' : ''].filter(Boolean);
    if (consent.length) dl.push(['Zugestimmt', consent.join(', ')]);
    Object.keys(d).forEach(function (k) {
      if (['agb', 'privacy', 'interest'].indexOf(k) === -1 && d[k] !== '' && d[k] != null) dl.push([esc(k), esc(d[k])]);
    });
    html += '<section class="card"><h2>Anfrage</h2><dl class="dl">' + dl.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl></section>';

    // Notes
    var notes = M.notesOf(b.id).slice().reverse();
    html += '<section class="card"><h2>Notizen</h2>' +
      '<form class="note-form" data-form="note"><label class="sr" for="note-text">Neue Notiz</label>' +
      '<textarea id="note-text" name="text" rows="2" placeholder="Notiz hinzufügen"></textarea><button class="btn" type="submit">Speichern</button></form>' +
      (notes.length ? '<ul class="notes">' + notes.map(function (n) {
        return '<li><span class="a-muted">' + fmtAgo(n.createdAt) + '</span><p>' + nl2br(n.text) + '</p></li>';
      }).join('') + '</ul>' : '') + '</section>';
    return html;
  }

  function viewAppointments() {
    var today = M.today();
    var appts = M.data().bookings.filter(function (b) { return b.kind === 'appointment' && b.status !== 'abgesagt'; });
    var upcoming = appts.filter(function (b) { return b.start.slice(0, 10) >= today; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var html = header('Termine', { action: '<a class="btn btn--ghost btn--sm" href="#verfuegbarkeit">' + icon('clock') + 'Verfügbarkeit</a>' });
    if (!upcoming.length) return html + '<p class="a-empty-line">Keine kommenden Termine.</p>';
    var byDay = {};
    upcoming.forEach(function (b) { (byDay[b.start.slice(0, 10)] = byDay[b.start.slice(0, 10)] || []).push(b); });
    Object.keys(byDay).forEach(function (day) {
      html += '<h2 class="group">' + esc(fmtDay(day)) + '</h2><div class="list">' + byDay[day].map(function (b) {
        var c = M.contact(b.contactId), t = b.start.slice(11);
        return '<a class="row" href="#anfrage/' + esc(b.id) + '"><span class="row-time">' + esc(t) + '<span>' + esc(addMin(t, M.minutesOf(b.service))) + '</span></span>' +
          '<span class="row-main"><strong>' + esc(fullName(c)) + '</strong><span>' + esc(M.serviceLabel(b.service)) + '</span></span>' +
          '<span class="row-side">' + pill(b.status) + '</span></a>';
      }).join('') + '</div>';
    });
    return html;
  }

  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var draft = null; // availability being edited
  function viewAvailability() {
    if (!draft) draft = JSON.parse(JSON.stringify(M.availability()));
    var html = header('Verfügbarkeit', { back: ['#termine', 'Termine'], sub: 'Zu diesen Zeiten können Termine online gebucht werden. Gebuchte Zeiten verschwinden automatisch.' });
    html += '<form class="card" data-form="availability"><h2>Wochenzeiten</h2><div class="week">';
    ORDER.forEach(function (wd) {
      var ranges = draft.hours[wd] || [];
      html += '<div class="wd"><span class="wd-name">' + WD_LONG[wd] + '</span><div class="wd-ranges">' +
        (ranges.length ? ranges.map(function (r, i) {
          return '<span class="range"><label class="sr" for="f-' + wd + '-' + i + '">' + WD_LONG[wd] + ' von</label><input type="time" id="f-' + wd + '-' + i + '" data-wd="' + wd + '" data-i="' + i + '" data-end="0" value="' + esc(r[0]) + '" step="900">' +
            '<span aria-hidden="true">–</span><label class="sr" for="t-' + wd + '-' + i + '">bis</label><input type="time" id="t-' + wd + '-' + i + '" data-wd="' + wd + '" data-i="' + i + '" data-end="1" value="' + esc(r[1]) + '" step="900">' +
            '<button type="button" class="icon-btn" data-action="range-del" data-wd="' + wd + '" data-i="' + i + '" aria-label="Zeit entfernen">' + icon('x') + '</button></span>';
        }).join('') : '<span class="a-muted">Nicht verfügbar</span>') +
        '</div><button type="button" class="icon-btn" data-action="range-add" data-wd="' + wd + '" aria-label="Zeit hinzufügen am ' + WD_LONG[wd] + '">' + icon('plus') + '</button></div>';
    });
    html += '</div><h2>Gesperrte Tage</h2><p class="a-muted">Ferien, Kurse oder freie Tage.</p><ul class="blocked">' +
      draft.blocked.slice().sort().map(function (d) {
        return '<li>' + esc(fmtDay(d)) + ' ' + d.slice(0, 4) + '<button type="button" class="icon-btn" data-action="block-del" data-date="' + esc(d) + '" aria-label="Sperre entfernen">' + icon('x') + '</button></li>';
      }).join('') + '</ul>' +
      '<div class="inline"><label class="sr" for="block-date">Tag sperren</label><input type="date" id="block-date" min="' + M.today() + '"><button type="button" class="btn btn--ghost btn--sm" data-action="block-add">Tag sperren</button></div>' +
      '<div class="form-end"><button class="btn" type="submit">Speichern</button><span class="saved" data-saved hidden>Gespeichert</span></div></form>';
    return html;
  }

  function viewCamps() {
    var camps = CFG.camps || [];
    var interest = M.data().bookings.filter(function (b) { return b.kind === 'interest' && b.status !== 'abgesagt' && b.status !== 'abgeschlossen'; }).length;
    var html = header('Camps');
    if (!camps.length) html += '<p class="a-empty-line">Keine kommenden Camps. Neue Daten in camps.json eintragen.</p>';
    html += '<div class="list">' + camps.map(function (c) {
      var taken = M.seatsTaken(c.id), total = M.seatsTotal(c.id);
      var wait = M.data().bookings.filter(function (b) { return b.campId === c.id && b.waitlist && b.status !== 'abgesagt'; }).length;
      var pct = total ? Math.min(100, Math.round(taken / total * 100)) : 0;
      return '<a class="row row--camp" href="#camp/' + esc(c.id) + '"><span class="row-main"><strong>' + esc(c.label) + '</strong><span>' + esc(c.title) + ' · ' + esc(c.time) + '</span>' +
        (total != null ? '<span class="bar" role="img" aria-label="' + taken + ' von ' + total + ' Plätzen belegt"><span style="width:' + pct + '%"></span></span>' : '') + '</span>' +
        '<span class="row-side"><strong class="seats">' + taken + (total != null ? '/' + total : '') + '</strong><span class="a-muted">' + (wait ? wait + ' auf Warteliste' : 'Kinder') + '</span></span></a>';
    }).join('') + '</div>';
    if (interest) html += '<p class="hint-line">' + interest + (interest === 1 ? ' Familie wartet' : ' Familien warten') + ' auf neue Camp-Daten. <a href="#anfragen" data-filter-link="offen">Ansehen</a></p>';
    return html;
  }

  function viewCamp(id) {
    var c = M.camp(id);
    if (!c) return header('Nicht gefunden', { back: ['#camps', 'Camps'] });
    var list = M.data().bookings.filter(function (b) { return b.kind === 'camp' && b.campId === id && b.status !== 'abgesagt'; });
    var total = M.seatsTotal(id), taken = M.seatsTaken(id);
    var html = header(c.label, {
      back: ['#camps', 'Camps'],
      sub: esc(c.title) + ' · ' + esc(c.time) + ' · CHF ' + esc(c.price),
      action: '<button type="button" class="btn btn--ghost btn--sm" data-action="camp-csv" data-id="' + esc(id) + '">' + icon('download') + 'Liste</button>'
    });
    html += '<form class="card inline" data-form="seats"><label for="seats">Plätze</label><input id="seats" name="seats" type="number" min="0" max="40" value="' + (total == null ? '' : total) + '" inputmode="numeric"><button class="btn btn--sm" type="submit">Speichern</button><span class="a-muted">' + taken + ' belegt</span></form>';
    function people(rows) {
      var out = [];
      rows.forEach(function (b) {
        var p = M.contact(b.contactId);
        (b.childIds || []).forEach(function (kid) {
          var k = M.child(kid);
          if (!k) return;
          out.push('<a class="row" href="#anfrage/' + esc(b.id) + '"><span class="row-main"><strong>' + esc(k.name) + (k.age ? ' <span class="a-muted">' + esc(k.age) + ' J.</span>' : '') + '</strong>' +
            '<span>' + esc(fullName(p)) + (p && p.phone ? ' · ' + esc(p.phone) : '') + '</span>' +
            (k.notes ? '<span class="note-warn">' + icon('alert') + esc(k.notes) + '</span>' : '') + '</span><span class="row-side">' + pill(b.status) + '</span></a>');
        });
      });
      return out.join('');
    }
    var confirmed = list.filter(function (b) { return !b.waitlist; }), waiting = list.filter(function (b) { return b.waitlist; });
    html += '<h2 class="group">Teilnehmende</h2>' + (confirmed.length ? '<div class="list">' + people(confirmed) + '</div>' : '<p class="a-empty-line">Noch keine Anmeldungen.</p>');
    if (waiting.length) html += '<h2 class="group">Warteliste</h2><div class="list">' + people(waiting) + '</div>';
    return html;
  }

  var contactQuery = '';
  function viewContacts() {
    var db = M.data();
    var q = contactQuery.trim().toLowerCase();
    var list = db.contacts.filter(function (c) {
      if (!q) return true;
      var kids = M.childrenOf(c.id).map(function (k) { return k.name; }).join(' ');
      return (fullName(c) + ' ' + c.email + ' ' + c.phone + ' ' + c.city + ' ' + kids).toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return fullName(a).localeCompare(fullName(b), 'de'); });
    var html = header('Kontakte', { action: '<button type="button" class="btn btn--ghost btn--sm" data-action="contacts-csv">' + icon('download') + 'CSV</button>' });
    html += '<div class="search">' + icon('search') + '<label class="sr" for="q">Suchen</label><input id="q" type="search" placeholder="Name, E-Mail, Kind …" value="' + esc(contactQuery) + '" autocomplete="off"></div>';
    html += '<div class="list" data-contact-list>' + contactRows(list) + '</div>';
    return html;
  }
  function contactRows(list) {
    if (!list.length) return '<p class="a-empty-line">Keine Kontakte gefunden.</p>';
    return list.map(function (c) {
      var kids = M.childrenOf(c.id).map(function (k) { return k.name; });
      var n = M.bookingsOf(c.id).length;
      return '<a class="row" href="#kontakt/' + esc(c.id) + '"><span class="row-main"><strong>' + esc(fullName(c)) + '</strong><span>' + esc(c.email) + (kids.length ? ' · ' + esc(kids.join(', ')) : '') + '</span></span>' +
        '<span class="row-side"><span class="a-muted">' + n + (n === 1 ? ' Anfrage' : ' Anfragen') + '</span>' + icon('next') + '</span></a>';
    }).join('');
  }

  function viewContact(id) {
    var c = M.contact(id);
    if (!c) return header('Nicht gefunden', { back: ['#kontakte', 'Kontakte'] });
    var html = header(fullName(c), { back: ['#kontakte', 'Kontakte'], sub: 'Kontakt seit ' + fmtAgo(c.createdAt) + (c.example ? ' · Beispiel' : '') });
    html += '<div class="actions">' + (c.phone ? '<a class="btn" href="tel:' + esc(c.phone.replace(/\s/g, '')) + '">' + icon('phone') + 'Anrufen</a>' : '') +
      '<a class="btn btn--ghost" href="mailto:' + esc(c.email) + '">' + icon('mail') + 'E-Mail</a></div>';
    var addr = [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    html += '<section class="card"><h2>Angaben</h2><dl class="dl">' +
      '<dt>E-Mail</dt><dd>' + esc(c.email) + '</dd>' +
      (c.phone ? '<dt>Mobile</dt><dd>' + esc(c.phone) + '</dd>' : '') +
      (addr ? '<dt>Adresse</dt><dd>' + esc(addr) + '</dd>' : '') + '</dl></section>';
    var kids = M.childrenOf(c.id);
    if (kids.length) {
      html += '<section class="card"><h2>Kinder</h2>' + kids.map(function (k) {
        return '<div class="kid"><strong>' + esc(k.name) + '</strong>' + (k.age ? ', ' + esc(k.age) + ' Jahre' : '') + (k.notes ? '<div class="note-warn">' + icon('alert') + esc(k.notes) + '</div>' : '') + '</div>';
      }).join('') + '</section>';
    }
    var bookings = M.bookingsOf(c.id).slice().reverse().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    html += '<h2 class="group">Anfragen</h2><div class="list">' + bookings.map(function (b) { return row(b, { title: KIND_LABEL[b.kind] }); }).join('') + '</div>';
    return html;
  }

  /* ---------- router ---------- */
  var TAB_OF = { anfragen: 'anfragen', anfrage: 'anfragen', termine: 'termine', verfuegbarkeit: 'termine', camps: 'camps', camp: 'camps', kontakte: 'kontakte', kontakt: 'kontakte' };
  var current = '';
  function render(keepFocus) {
    var hash = location.hash.replace(/^#/, '') || 'anfragen';
    var parts = hash.split('/'), route = parts[0], id = decodeURIComponent(parts[1] || '');
    if (route !== 'verfuegbarkeit') draft = null;
    var views = {
      anfragen: viewInbox, anfrage: viewBooking, termine: viewAppointments, verfuegbarkeit: viewAvailability,
      camps: viewCamps, camp: viewCamp, kontakte: viewContacts, kontakt: viewContact
    };
    app.innerHTML = (views[route] || viewInbox)(id);
    document.querySelectorAll('.a-tabs a').forEach(function (a) {
      if (a.getAttribute('data-tab') === (TAB_OF[route] || 'anfragen')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var n = M.data().bookings.filter(function (b) { return b.status === 'neu'; }).length;
    var badge = document.querySelector('[data-count-new]');
    badge.hidden = !n; badge.textContent = n;
    var h1 = app.querySelector('h1');
    document.title = (h1 ? h1.textContent + ' | ' : '') + 'CRM Horse & Mind';
    if (!keepFocus && hash !== current && h1) { h1.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    current = hash;
  }
  window.addEventListener('hashchange', function () { render(); });
  M.onChange(function () { if (location.hash.indexOf('#verfuegbarkeit') !== 0) render(true); });

  /* ---------- events ---------- */
  function bookingId() { return decodeURIComponent((location.hash.split('/')[1] || '')); }

  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action], [data-filter], [data-filter-link]');
    if (!t) return;
    if (t.hasAttribute('data-filter-link')) { inboxFilter = t.getAttribute('data-filter-link'); return; }
    if (t.hasAttribute('data-filter')) { inboxFilter = t.getAttribute('data-filter'); render(true); return; }
    var a = t.getAttribute('data-action');
    if (a === 'status') { M.setStatus(bookingId(), t.getAttribute('data-status')); render(true); }
    if (a === 'waitlist') { M.setWaitlist(bookingId(), t.getAttribute('data-value') === '1'); render(true); }
    if (a === 'range-add') {
      var wd = t.getAttribute('data-wd');
      var r = draft.hours[wd] = draft.hours[wd] || [];
      r.push(r.length ? [r[r.length - 1][1], addMin(r[r.length - 1][1], 120)] : ['09:00', '12:00']);
      render(true);
    }
    if (a === 'range-del') { draft.hours[t.getAttribute('data-wd')].splice(+t.getAttribute('data-i'), 1); render(true); }
    if (a === 'block-add') {
      var input = document.getElementById('block-date');
      if (input.value && draft.blocked.indexOf(input.value) === -1) draft.blocked.push(input.value);
      render(true);
    }
    if (a === 'block-del') { draft.blocked = draft.blocked.filter(function (d) { return d !== t.getAttribute('data-date'); }); render(true); }
    if (a === 'contacts-csv') {
      var rows = [['Vorname', 'Nachname', 'E-Mail', 'Mobile', 'Strasse', 'PLZ', 'Ort', 'Kinder', 'Anfragen', 'Kontakt seit']];
      M.data().contacts.forEach(function (c) {
        rows.push([c.firstName, c.lastName, c.email, c.phone, c.street, c.zip, c.city,
          M.childrenOf(c.id).map(function (k) { return k.name + (k.age ? ' (' + k.age + ')' : ''); }).join(', '),
          M.bookingsOf(c.id).length, c.createdAt.slice(0, 10)]);
      });
      downloadCSV('kontakte-' + M.today() + '.csv', rows);
    }
    if (a === 'camp-csv') {
      var id = t.getAttribute('data-id'), camp = M.camp(id);
      var out = [['Kind', 'Alter', 'Hinweise', 'Elternteil', 'Mobile', 'E-Mail', 'Status', 'Warteliste']];
      M.data().bookings.filter(function (b) { return b.kind === 'camp' && b.campId === id && b.status !== 'abgesagt'; }).forEach(function (b) {
        var p = M.contact(b.contactId) || {};
        (b.childIds || []).forEach(function (kid) {
          var k = M.child(kid) || {};
          out.push([k.name, k.age, k.notes, fullName(p), p.phone, p.email, STATUS_LABEL[b.status], b.waitlist ? 'ja' : 'nein']);
        });
      });
      downloadCSV('camp-' + (camp ? camp.start : id) + '.csv', out);
    }
  });

  app.addEventListener('input', function (e) {
    if (e.target.id === 'q') {
      contactQuery = e.target.value;
      var all = M.data().contacts.slice();
      var q = contactQuery.trim().toLowerCase();
      var list = all.filter(function (c) {
        var kids = M.childrenOf(c.id).map(function (k) { return k.name; }).join(' ');
        return !q || (fullName(c) + ' ' + c.email + ' ' + c.phone + ' ' + c.city + ' ' + kids).toLowerCase().indexOf(q) !== -1;
      }).sort(function (a, b) { return fullName(a).localeCompare(fullName(b), 'de'); });
      app.querySelector('[data-contact-list]').innerHTML = contactRows(list);
    }
    if (e.target.matches('input[type=time][data-wd]')) {
      var t = e.target;
      draft.hours[t.getAttribute('data-wd')][+t.getAttribute('data-i')][+t.getAttribute('data-end')] = t.value;
    }
  });

  app.addEventListener('submit', function (e) {
    var f = e.target.getAttribute('data-form');
    if (!f) return;
    e.preventDefault();
    if (f === 'note') { M.addNote(bookingId(), e.target.elements.text.value); render(true); }
    if (f === 'seats') { M.setSeats(bookingId(), e.target.elements.seats.value); render(true); }
    if (f === 'availability') {
      var bad = Object.keys(draft.hours).some(function (wd) {
        return draft.hours[wd].some(function (r) { return !r[0] || !r[1] || r[0] >= r[1]; });
      });
      if (bad) { alert('Bitte prüfe die Zeiten: «von» muss vor «bis» liegen.'); return; }
      M.setAvailability(draft);
      draft = null; render(true);
      var s = app.querySelector('[data-saved]'); if (s) s.hidden = false;
    }
  });

  // Demo reset (header)
  var top = document.querySelector('.a-top-actions');
  var reset = document.createElement('button');
  reset.type = 'button'; reset.className = 'a-link';
  reset.innerHTML = icon('reset') + '<span>Zurücksetzen</span>';
  reset.title = 'Beispieldaten wiederherstellen';
  reset.addEventListener('click', function () {
    if (confirm('Alle Demo-Daten löschen und die Beispiele wiederherstellen?')) { M.reset(); location.hash = '#anfragen'; render(); }
  });
  top.insertBefore(reset, top.lastElementChild);

  render();
})();
