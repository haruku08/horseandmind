/* Horse & Mind – demo backend (apiBase "mock").
   Answers the booking API from site.js and serves the CRM at /admin/.
   Data lives in this browser's localStorage only. The data model mirrors the planned
   database (contacts, children, bookings with status + flexible details, notes),
   so a real backend can replace this file without touching the pages. */
(function () {
  'use strict';
  var KEY = 'hm-demo-v1';
  var CFG = window.HM_CONFIG || {};
  var TZ = CFG.timezone || 'Europe/Zurich';
  var STATUSES = ['neu', 'kontaktiert', 'gebucht', 'bezahlt', 'abgeschlossen', 'abgesagt'];
  // Durations are examples until the real ones are known (site.json → services)
  var DEMO_MINUTES = { erstgespraech: 30, coaching: 60, reitpaedagogik: 60 };

  /* ---------- dates (Swiss time, as YYYY-MM-DD / HH:MM strings) ---------- */
  function today() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function addDays(iso, n) {
    var d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function weekday(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); } // 0 = Sunday
  function toMin(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  function toHHMM(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
  function stamp(daysAgo, hhmm) { return addDays(today(), -daysAgo) + 'T' + (hhmm || '09:00'); }
  function nowStamp() {
    var t = new Intl.DateTimeFormat('de-CH', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
    return today() + 'T' + t;
  }

  function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
  function minutesOf(service) {
    var s = (CFG.services || []).filter(function (x) { return x.id === service; })[0];
    return (s && s.minutes) || DEMO_MINUTES[service] || 60;
  }
  function serviceLabel(id) {
    var s = (CFG.services || []).filter(function (x) { return x.id === id; })[0];
    return s ? s.label : id;
  }
  function camp(id) { return (CFG.camps || []).filter(function (c) { return c.id === id; })[0] || null; }

  /* ---------- storage ---------- */
  var memory = null; // used when localStorage is blocked (private mode)
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var parsed = JSON.parse(raw); if (parsed && parsed.v === 1) return parsed; }
    } catch (e) { /* fall through */ }
    if (memory) return memory;
    var fresh = seed();
    write(fresh);
    return fresh;
  }
  function write(db) {
    memory = db;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* memory only */ }
  }
  function change(fn) { var db = read(); var out = fn(db); write(db); return out; }

  /* ---------- example data ---------- */
  function seed() {
    var c1 = (CFG.camps || [])[0], c2 = (CFG.camps || [])[1] || c1;
    var db = {
      v: 1,
      contacts: [], children: [], bookings: [], notes: [],
      campSeats: {},
      availability: {
        // weekday (0 = Sunday) → time ranges. Example hours until Manuela sets her own.
        hours: { 1: [], 2: [['13:30', '17:30']], 3: [['13:30', '17:30']], 4: [], 5: [['09:00', '12:00'], ['13:30', '17:00']], 6: [['09:00', '12:00']], 0: [] },
        blocked: []
      }
    };
    function contact(first, last, email, phone, city, daysAgo) {
      var c = { id: uid('c'), firstName: first, lastName: last, email: email, phone: phone, street: '', zip: '', city: city, createdAt: stamp(daysAgo), example: true };
      db.contacts.push(c); return c;
    }
    function child(contact, name, age, notes) {
      var k = { id: uid('k'), contactId: contact.id, name: name, age: age, notes: notes || '' };
      db.children.push(k); return k;
    }
    function booking(b) {
      b.id = uid('b'); b.example = true;
      b.details = b.details || {};
      db.bookings.push(b); return b;
    }
    function note(b, text, daysAgo) { db.notes.push({ id: uid('n'), bookingId: b.id, text: text, createdAt: stamp(daysAgo, '18:10') }); }

    var keller = contact('Sandra', 'Keller', 'sandra.keller@example.ch', '+41 79 111 22 33', 'Winterthur', 21);
    var meier = contact('Thomas', 'Meier', 'thomas.meier@example.ch', '+41 78 222 33 44', 'Seuzach', 3);
    var brunner = contact('Lea', 'Brunner', 'lea.brunner@example.ch', '+41 76 333 44 55', 'Winterthur', 1);
    var frei = contact('Nadine', 'Frei', 'nadine.frei@example.ch', '+41 79 444 55 66', 'Elgg', 40);
    var huber = contact('Marco', 'Huber', 'marco.huber@example.ch', '', 'Wiesendangen', 0);
    var steiner = contact('Julia', 'Steiner', 'julia.steiner@example.ch', '+41 77 555 66 77', 'Winterthur', 9);

    var mia = child(keller, 'Mia', 8, 'Leichte Pollenallergie');
    var noah = child(keller, 'Noah', 6);
    var elin = child(brunner, 'Elin', 9);
    var tim = child(steiner, 'Tim', 7, 'Hat etwas Angst vor grossen Tieren');

    if (c1) {
      var b1 = booking({ kind: 'camp', status: 'bezahlt', contactId: keller.id, campId: c1.id, childIds: [mia.id, noah.id], waitlist: false, createdAt: stamp(21, '20:41'), source: 'web:kids-camp', message: 'Die beiden möchten gerne zusammen in eine Gruppe.', details: { agb: true, privacy: true } });
      note(b1, 'Rechnung verschickt.', 18);
      note(b1, 'Zahlung eingegangen.', 12);
      booking({ kind: 'camp', status: 'neu', contactId: brunner.id, campId: c1.id, childIds: [elin.id], waitlist: false, createdAt: stamp(1, '07:55'), source: 'web:kids-camp', message: '', details: { agb: true, privacy: true } });
    }
    if (c2) {
      var b3 = booking({ kind: 'camp', status: 'kontaktiert', contactId: steiner.id, campId: c2.id, childIds: [tim.id], waitlist: false, createdAt: stamp(9, '21:15'), source: 'web:kids-camp', message: 'Tim ist eher schüchtern.', details: { agb: true, privacy: true } });
      note(b3, 'Telefoniert: Tim darf am ersten Tag mit Mama kommen.', 7);
    }
    var b4 = booking({ kind: 'appointment', status: 'gebucht', contactId: meier.id, service: 'erstgespraech', start: nextSlotDate(db, 2) + 'T14:00', createdAt: stamp(3, '12:30'), source: 'web:termin', message: 'Unser Sohn (10) hat seit dem Schulwechsel oft Bauchweh vor der Schule.', details: {} });
    note(b4, 'Rückruf am Abend gewünscht.', 2);
    booking({ kind: 'appointment', status: 'abgeschlossen', contactId: frei.id, service: 'coaching', start: addDays(today(), -14) + 'T09:00', createdAt: stamp(40, '19:02'), source: 'web:termin', message: '', details: {} });
    booking({ kind: 'contact', status: 'neu', contactId: huber.id, createdAt: stamp(0, '08:12'), source: 'web:kontakt', message: 'Guten Tag, bieten Sie Wingwave auch für Prüfungsangst an? Meine Tochter macht im Frühling die Gymi-Prüfung.', details: { interest: 'wingwave' } });
    return db;
  }
  // Next day (≥ n days from today) that has opening hours – keeps the example appointment realistic
  function nextSlotDate(db, n) {
    for (var i = n; i < n + 14; i++) {
      var d = addDays(today(), i);
      if ((db.availability.hours[weekday(d)] || []).length) return d;
    }
    return addDays(today(), n);
  }

  /* ---------- shared logic ---------- */
  function contactBookings(db, contactId) { return db.bookings.filter(function (b) { return b.contactId === contactId; }); }
  function active(b) { return b.status !== 'abgesagt'; }

  function seatsTaken(db, campId) {
    return db.bookings.filter(function (b) { return b.kind === 'camp' && b.campId === campId && !b.waitlist && active(b); })
      .reduce(function (n, b) { return n + (b.childIds || []).length; }, 0);
  }
  function seatsTotal(db, campId) {
    if (db.campSeats[campId] != null) return db.campSeats[campId];
    var c = camp(campId);
    return c && c.seats != null ? c.seats : null;
  }

  function freeSlots(db, service, days) {
    var dur = minutesOf(service), out = [], start = addDays(today(), 1);
    var taken = db.bookings.filter(function (b) { return b.kind === 'appointment' && active(b) && b.start; });
    for (var i = 0; i < days; i++) {
      var date = addDays(start, i), slots = [];
      if (db.availability.blocked.indexOf(date) === -1) {
        (db.availability.hours[weekday(date)] || []).forEach(function (r) {
          for (var t = toMin(r[0]); t + dur <= toMin(r[1]); t += 30) {
            var clash = taken.some(function (b) {
              if (b.start.slice(0, 10) !== date) return false;
              var bs = toMin(b.start.slice(11)), be = bs + minutesOf(b.service);
              return t < be && bs < t + dur;
            });
            if (!clash) slots.push(toHHMM(t));
          }
        });
      }
      out.push({ date: date, slots: slots });
    }
    return out;
  }

  // Find a contact by email (case-insensitive) or create one; newer form data fills the fields
  function upsertContact(db, f) {
    var email = String(f.email || '').trim().toLowerCase();
    var c = db.contacts.filter(function (x) { return x.email.toLowerCase() === email; })[0];
    if (!c) { c = { id: uid('c'), email: email, createdAt: nowStamp() }; db.contacts.push(c); }
    ['firstName', 'lastName', 'phone', 'street', 'zip', 'city'].forEach(function (k) {
      if (f[k] && String(f[k]).trim()) c[k] = String(f[k]).trim();
      else if (c[k] == null) c[k] = '';
    });
    return c;
  }
  function upsertChild(db, contactId, k) {
    var name = String(k.name || '').trim();
    var found = db.children.filter(function (x) { return x.contactId === contactId && x.name.toLowerCase() === name.toLowerCase(); })[0];
    if (!found) { found = { id: uid('k'), contactId: contactId, name: name, age: null, notes: '' }; db.children.push(found); }
    if (k.age) found.age = +k.age;
    if (k.notes) found.notes = String(k.notes).trim();
    return found;
  }

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function invalid(f) {
    if (!f.firstName || !f.lastName) return 'Bitte gib deinen Vor- und Nachnamen an.';
    if (!EMAIL.test(String(f.email || ''))) return 'Bitte prüfe deine E-Mail-Adresse.';
    return null;
  }
  // Everything the form sent that has no column of its own goes into details
  var CORE = ['firstName', 'lastName', 'email', 'phone', 'street', 'zip', 'city', 'message', 'source', 'children', 'date', 'camp', 'service', 'start'];
  function extras(f) {
    var d = {};
    Object.keys(f).forEach(function (k) {
      if (CORE.indexOf(k) === -1) d[k] = f[k] === 'on' ? true : f[k];
    });
    return d;
  }

  /* ---------- booking API (same contract as the real backend) ---------- */
  function respond(status, body) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ ok: status < 400, status: status, body: body }); }, 350);
    });
  }

  function handle(method, path, f) {
    var url = new URL(path, 'https://x');
    var p = url.pathname;
    if (method === 'GET' && p === '/slots') {
      var days = Math.min(+url.searchParams.get('days') || 21, 60);
      return respond(200, { days: freeSlots(read(), url.searchParams.get('service'), days) });
    }
    if (method !== 'POST') return respond(404, { error: 'Unbekannte Anfrage.' });
    var err = invalid(f || {});
    if (err) return respond(400, { error: err });

    if (p === '/bookings/camp') {
      return respond.apply(null, change(function (db) {
        var c = upsertContact(db, f);
        var kids = (f.children || []).map(function (k) { return upsertChild(db, c.id, k); });
        if (!kids.length) return [400, { error: 'Bitte gib mindestens ein Kind an.' }];
        var interest = f.date === 'interesse';
        var total = interest ? null : seatsTotal(db, f.date);
        var wait = !interest && total != null && seatsTaken(db, f.date) + kids.length > total;
        db.bookings.push({
          id: uid('b'), kind: interest ? 'interest' : 'camp', status: 'neu', contactId: c.id,
          campId: interest ? null : f.date, childIds: kids.map(function (k) { return k.id; }), waitlist: wait,
          createdAt: nowStamp(), source: f.source || '', message: f.message || '', details: extras(f)
        });
        if (interest) return [201, { message: 'Danke! Wir melden uns, sobald die nächsten Camp-Daten feststehen.' }];
        if (wait) return [201, { message: 'Danke! Das Camp ist leider voll – du stehst auf der Warteliste. Wir melden uns, sobald ein Platz frei wird.' }];
        return [201, { message: 'Danke! Deine Anmeldung ist angekommen. Wir melden uns mit der Bestätigung.' }];
      }));
    }
    if (p === '/bookings/appointment') {
      return respond.apply(null, change(function (db) {
        var date = String(f.start || '').slice(0, 10), time = String(f.start || '').slice(11);
        var day = freeSlots(db, f.service, 60).filter(function (d) { return d.date === date; })[0];
        if (!day || day.slots.indexOf(time) === -1) return [409, { error: 'Diese Zeit ist leider nicht mehr frei. Bitte wähle eine andere.' }];
        var c = upsertContact(db, f);
        db.bookings.push({
          id: uid('b'), kind: 'appointment', status: 'gebucht', contactId: c.id, service: f.service, start: f.start,
          createdAt: nowStamp(), source: f.source || '', message: f.message || '', details: extras(f)
        });
        return [201, { message: 'Danke! Dein Termin ist eingetragen.' }];
      }));
    }
    if (p === '/contact') {
      return respond.apply(null, change(function (db) {
        var c = upsertContact(db, f);
        db.bookings.push({
          id: uid('b'), kind: 'contact', status: 'neu', contactId: c.id,
          createdAt: nowStamp(), source: f.source || '', message: f.message || '', details: extras(f)
        });
        return [201, { message: 'Danke für deine Nachricht! Ich melde mich so bald wie möglich.' }];
      }));
    }
    return respond(404, { error: 'Unbekannte Anfrage.' });
  }

  /* ---------- CRM functions (used by /admin/) ---------- */
  var crm = {
    STATUSES: STATUSES,
    today: today,
    minutesOf: minutesOf,
    serviceLabel: serviceLabel,
    camp: camp,
    data: read,
    contact: function (id) { return read().contacts.filter(function (c) { return c.id === id; })[0] || null; },
    booking: function (id) { return read().bookings.filter(function (b) { return b.id === id; })[0] || null; },
    childrenOf: function (contactId) { return read().children.filter(function (k) { return k.contactId === contactId; }); },
    child: function (id) { return read().children.filter(function (k) { return k.id === id; })[0] || null; },
    bookingsOf: function (contactId) { return contactBookings(read(), contactId); },
    notesOf: function (bookingId) { return read().notes.filter(function (n) { return n.bookingId === bookingId; }); },
    seatsTaken: function (campId) { return seatsTaken(read(), campId); },
    seatsTotal: function (campId) { return seatsTotal(read(), campId); },
    setStatus: function (id, status) {
      if (STATUSES.indexOf(status) === -1) return;
      change(function (db) { db.bookings.forEach(function (b) { if (b.id === id) b.status = status; }); });
    },
    setWaitlist: function (id, wait) {
      change(function (db) { db.bookings.forEach(function (b) { if (b.id === id) b.waitlist = !!wait; }); });
    },
    addNote: function (bookingId, text) {
      text = String(text || '').trim();
      if (!text) return;
      change(function (db) { db.notes.push({ id: uid('n'), bookingId: bookingId, text: text, createdAt: nowStamp() }); });
    },
    setSeats: function (campId, seats) {
      change(function (db) { db.campSeats[campId] = seats === '' || seats == null ? null : Math.max(0, +seats); });
    },
    availability: function () { return read().availability; },
    setAvailability: function (a) { change(function (db) { db.availability = a; }); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } memory = null; return read(); },
    onChange: function (fn) { window.addEventListener('storage', function (e) { if (e.key === KEY) fn(); }); }
  };

  window.HMMock = {
    request: handle,
    seatsLeft: function (campId) {
      var db = read(), total = seatsTotal(db, campId);
      return total == null ? null : total - seatsTaken(db, campId);
    },
    crm: crm
  };
})();
