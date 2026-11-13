/* Horse & Mind – small site script. No libraries. */
(function () {
  'use strict';
  var CFG = window.HM_CONFIG || {};
  var API = (CFG.apiBase || '').replace(/\/$/, '');
  var TZ = CFG.timezone || 'Europe/Zurich';
  var BASE = CFG.base || ''; // subfolder prefix when the site is not served from the domain root

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function todayISO() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  var TODAY = todayISO();

  // All calls to the booking API go through here. With apiBase "mock" the demo backend
  // (mock-api.js) answers instead of the network, using the same paths and responses.
  function request(method, path, body) {
    if (API === 'mock' && window.HMMock) return window.HMMock.request(method, path, body);
    return fetch(API + path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, status: r.status, body: b }; });
    });
  }
  var params = new URLSearchParams(location.search);

  /* Mobile menu: full-screen panel */
  var toggle = $('.nav-toggle'), nav = $('#nav');
  if (toggle && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 835px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* Mega menu (desktop): opens on hover with a short delay, on keyboard focus and on first tap */
  var desktop = window.matchMedia('(min-width: 835px)');
  var megaItems = $all('[data-mega]');
  var scrim = $('[data-mega-scrim]');
  var openItem = null, openTimer = null, closeTimer = null;
  function setOpen(item) {
    if (openItem === item) return;
    if (openItem) { openItem.classList.remove('is-open'); $('.nav-link', openItem).setAttribute('aria-expanded', 'false'); }
    openItem = item;
    if (item) { item.classList.add('is-open'); $('.nav-link', item).setAttribute('aria-expanded', 'true'); }
    document.body.classList.toggle('mega-open', !!item);
  }
  megaItems.forEach(function (item) {
    var link = $('.nav-link', item);
    item.addEventListener('mouseenter', function () {
      if (!desktop.matches) return;
      clearTimeout(closeTimer); clearTimeout(openTimer);
      openTimer = setTimeout(function () { setOpen(item); }, openItem ? 0 : 120);
    });
    item.addEventListener('mouseleave', function () {
      if (!desktop.matches) return;
      clearTimeout(openTimer);
      closeTimer = setTimeout(function () { if (openItem === item) setOpen(null); }, 180);
    });
    item.addEventListener('focusin', function () { if (desktop.matches) setOpen(item); });
    item.addEventListener('focusout', function (e) {
      if (desktop.matches && !item.contains(e.relatedTarget)) setTimeout(function () { if (!item.contains(document.activeElement) && openItem === item) setOpen(null); }, 0);
    });
    // touch screens without hover: first tap opens the panel, second tap follows the link
    link.addEventListener('click', function (e) {
      if (desktop.matches && window.matchMedia('(hover: none)').matches && openItem !== item) { e.preventDefault(); setOpen(item); }
    });
  });
  if (scrim) scrim.addEventListener('click', function () { setOpen(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openItem) { var l = $('.nav-link', openItem); setOpen(null); l.focus(); }
  });
  desktop.addEventListener('change', function () { setOpen(null); });

  /* Cookie consent: Google Analytics loads only after "Akzeptieren" (production builds only) */
  var CONSENT_KEY = 'hm-consent';
  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* private mode: ask again next time */ } }
  function loadAnalytics(id) {
    if (window.gtag) return;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }
  function removeAnalyticsCookies() {
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^_ga/.test(name)) {
        [location.hostname, '.' + location.hostname.replace(/^www\./, '')].forEach(function (d) {
          document.cookie = name + '=; Max-Age=0; path=/; domain=' + d;
        });
        document.cookie = name + '=; Max-Age=0; path=/';
      }
    });
  }
  if (CFG.gaId) {
    var openLink = $('[data-consent-open]');
    if (openLink) openLink.hidden = false;
    var banner = null;
    var showBanner = function () {
      if (banner) { banner.hidden = false; $('button', banner).focus(); return; }
      banner = document.createElement('div');
      banner.className = 'consent-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Cookies');
      banner.innerHTML = '<p>Darf ich mit Google Analytics anonym messen, wie die Website genutzt wird? Dafür werden Cookies gesetzt. <a href="' + BASE + '/datenschutz/#analytics">Mehr erfahren</a></p>' +
        '<div class="consent-actions"><button type="button" class="btn btn--sm" data-consent="yes">Akzeptieren</button><button type="button" class="btn btn--sm btn--outline" data-consent="no">Ablehnen</button></div>';
      document.body.appendChild(banner);
      banner.addEventListener('click', function (e) {
        var b = e.target.closest('[data-consent]');
        if (!b) return;
        var v = b.getAttribute('data-consent'), before = getConsent();
        setConsent(v);
        banner.hidden = true;
        if (v === 'yes') loadAnalytics(CFG.gaId);
        else if (before === 'yes') { removeAnalyticsCookies(); location.reload(); }
      });
    };
    var c = getConsent();
    if (c === 'yes') loadAnalytics(CFG.gaId);
    else if (c !== 'no') showBanner();
    if (openLink) openLink.addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
  }

  /* Galleries: previous/next buttons scroll by one card */
  $all('[data-gallery]').forEach(function (g) {
    var track = $('.gallery-track', g), prev = $('[data-prev]', g), next = $('[data-next]', g);
    if (!track || !prev || !next) return;
    function step() { var card = track.firstElementChild; return card ? card.getBoundingClientRect().width + 20 : 300; }
    function update() {
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* Camp dates: hide anything that ended before today, even if the site was built earlier */
  $all('[data-dates]').forEach(function (list) {
    var left = 0;
    $all('.date[data-end]', list).forEach(function (el) {
      if (el.getAttribute('data-end') < TODAY) el.remove(); else left++;
    });
    var empty = $('[data-dates-empty]', list);
    if (empty) empty.hidden = left > 0;
  });
  $all('.band[data-end]').forEach(function (el) {
    if (el.getAttribute('data-end') < TODAY) {
      var cta = $('.band-action', el);
      var p = $('.band-info p:last-child', el);
      if (p) p.textContent = 'Neue Daten folgen bald – melde dein Interesse, dann erfährst du es zuerst.';
      if (cta) cta.innerHTML = '<a class="btn btn--light" href="' + BASE + '/kids/land-der-gefuehle/">Mehr zum Camp</a>';
    }
  });

  /* Demo: show live seat counts from the mock store on camp date cards */
  if (API === 'mock' && window.HMMock) {
    $all('.date[data-id]').forEach(function (el) {
      var left = window.HMMock.seatsLeft(el.getAttribute('data-id'));
      if (left === null) return;
      var chip = $('.chip', el), link = $('a.btn', el);
      if (left <= 0) {
        chip.className = 'chip chip--full'; chip.textContent = 'Ausgebucht';
        link.textContent = 'Auf die Warteliste'; link.classList.add('btn--outline');
      } else {
        chip.className = 'chip chip--' + (left <= 3 ? 'few' : 'open');
        chip.textContent = left === 1 ? 'Noch 1 Platz frei' : 'Noch ' + left + ' Plätze frei';
      }
    });
  }

  /* Camp booking: date select */
  $all('[data-camp-select]').forEach(function (select) {
    $all('option[data-end]', select).forEach(function (o) { if (o.getAttribute('data-end') < TODAY) o.remove(); });
    var want = params.get('interesse') ? 'interesse' : params.get('datum');
    if (want && select.querySelector('option[value="' + CSS.escape(want) + '"]')) select.value = want;
    var form = select.form;
    var box = $('[data-picked]', form), label = $('[data-picked-label]', form), meta = $('[data-picked-meta]', form);
    var submit = $('button[type="submit"]', form);
    function update() {
      var o = select.options[select.selectedIndex];
      if (!o || !o.value) { box.hidden = true; return; }
      box.hidden = false;
      label.textContent = o.getAttribute('data-label') || o.textContent;
      meta.textContent = o.getAttribute('data-meta') || '';
      var wait = o.getAttribute('data-wait') === '1' || o.value === 'interesse';
      if (submit) submit.textContent = o.value === 'interesse' ? 'Interesse melden' : (wait ? 'Auf die Warteliste setzen' : 'Verbindlich anmelden');
    }
    select.addEventListener('change', update);
    update();
  });

  /* Siblings: add up to 4 children */
  $all('[data-add-child]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var set = btn.closest('[data-children]');
      var children = $all('[data-child]', set);
      if (children.length >= 4) return;
      var clone = children[0].cloneNode(true);
      $all('input, textarea', clone).forEach(function (f) { f.value = ''; f.required = false; });
      set.insertBefore(clone, btn);
      if (children.length + 1 >= 4) btn.hidden = true;
      var first = $('input', clone); if (first) first.focus();
    });
  });

  /* Forms → booking API */
  var ENDPOINT = { camp: '/bookings/camp', appointment: '/bookings/appointment', contact: '/contact' };
  var OK_TEXT = {
    camp: 'Danke! Deine Anmeldung ist bei uns angekommen. Du bekommst gleich eine Bestätigung per E-Mail.',
    appointment: 'Danke! Dein Termin ist gebucht. Die Kalendereinladung ist unterwegs zu dir.',
    contact: 'Danke für deine Nachricht! Ich melde mich so bald wie möglich.'
  };

  function formToJSON(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key.slice(-2) === '[]') {
        key = key.slice(0, -2);
        (data[key] = data[key] || []).push(value);
      } else data[key] = value;
    });
    if (data.childName) {
      data.children = data.childName.map(function (n, i) {
        return { name: n, age: (data.childAge || [])[i] || '', notes: (data.childNotes || [])[i] || '' };
      }).filter(function (c) { return c.name.trim(); });
      delete data.childName; delete data.childAge; delete data.childNotes;
    }
    return data;
  }

  function showStatus(form, ok, text) {
    var box = $('[data-form-status]', form);
    if (!box) return;
    box.hidden = false;
    box.className = 'form-status ' + (ok ? 'form-status--ok' : 'form-status--err');
    box.textContent = text;
  }

  /* Until our own booking API exists: post the form to the Zoho CRM webform (site.json → zoho).
     Fields Zoho has no slot for are written into its description field, so nothing gets lost. */
  var LABELS = {
    date: 'Camp-Datum', camp: 'Camp', interest: 'Interesse', message: 'Nachricht', source: 'Quelle',
    street: 'Strasse', zip: 'PLZ', city: 'Ort', phone: 'Mobile', privacy: 'Datenschutz akzeptiert', agb: 'AGB akzeptiert'
  };
  function sendToZoho(form, kind, data) {
    var z = (CFG.zoho || {})[kind];
    if (!z || !z.action) return false;
    var map = z.fields || {};
    var post = document.createElement('form');
    post.method = 'POST';
    post.action = z.action;
    post.acceptCharset = 'UTF-8';
    post.hidden = true;
    function add(name, value) {
      var input = document.createElement('input');
      input.type = 'hidden'; input.name = name; input.value = value;
      post.appendChild(input);
    }
    Object.keys(z.hidden || {}).forEach(function (k) { add(k, z.hidden[k]); });

    // Camp date: Manuela's own format in its Zoho field, readable text in the description
    var sel = form.querySelector('[data-camp-select]');
    if (sel && sel.value) {
      var o = sel.options[sel.selectedIndex];
      var wait = o.getAttribute('data-wait') === '1';
      if (z.campDateField && o.getAttribute('data-zoho')) add(z.campDateField, (wait ? 'WARTELISTE ' : '') + o.getAttribute('data-zoho'));
      if (z.campDateField && sel.value === 'interesse') add(z.campDateField, 'Interesse nächstes Camp');
      data.date = (o.getAttribute('data-label') || o.textContent) + (wait ? ' (Warteliste)' : '');
    }
    if (z.childNamesField && data.children && data.children.length) {
      add(z.childNamesField, data.children.map(function (c) { return c.name; }).join(', '));
    }
    if (z.leadSource) {
      var ls = z.leadSource.byInterest || {};
      add(z.leadSource.field, ls[data.interest] || ls._default || '');
    }
    var lines = [];
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (k === 'children') {
        v.forEach(function (c, i) {
          lines.push('Kind ' + (i + 1) + ': ' + c.name + (c.age ? ', ' + c.age + ' Jahre' : '') + (c.notes ? ' – ' + c.notes : ''));
        });
        return;
      }
      if (v === 'on') v = 'ja';
      if (map[k]) add(map[k], v);
      else if (v !== '') lines.push((LABELS[k] || k) + ': ' + v);
    });
    if (z.descriptionField) add(z.descriptionField, lines.join('\n'));
    document.body.appendChild(post);
    showStatus(form, true, 'Wird gesendet …');
    post.submit();
    return true;
  }

  $all('[data-booking-form]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var kind = form.getAttribute('data-kind');
      var data = formToJSON(form);
      if (data.company) { showStatus(form, true, OK_TEXT[kind]); return; } // honeypot: pretend success
      delete data.company;
      if (!API) {
        if (sendToZoho(form, kind, data)) return;
        showStatus(form, false, 'Das Formular ist noch nicht verbunden. Bitte schreib mir direkt an ' + (CFG.email || 'info@horseandmind.ch') + '.');
        return;
      }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      request('POST', ENDPOINT[kind], data).then(function (res) {
        if (res.ok) {
          showStatus(form, true, (res.body && res.body.message) || OK_TEXT[kind]);
          form.dispatchEvent(new CustomEvent('hm:booked'));
          $all('input:not([type=hidden]), textarea, select, button', form).forEach(function (f) { f.disabled = true; });
        } else {
          showStatus(form, false, (res.body && res.body.error) || 'Das hat leider nicht geklappt. Bitte versuche es nochmals.');
          btn.disabled = false;
        }
      }).catch(function () {
        showStatus(form, false, 'Keine Verbindung. Bitte prüfe dein Internet und versuche es nochmals.');
        btn.disabled = false;
      });
    });
  });

  /* Appointment picker (needs the booking API; until then the Calendly fallback stays visible) */
  var picker = $('[data-picker]');
  if (picker && API) {
    $('[data-booking-fallback]').hidden = true;
    picker.hidden = false;
    var services = (CFG.services || []);
    var state = { service: params.get('angebot') || (services[0] && services[0].id), day: null, slot: null, days: [] };
    var elServices = $('[data-services]', picker), elDays = $('[data-days]', picker), elSlots = $('[data-slots]', picker);
    var elEmpty = $('[data-slots-empty]', picker), elMonth = $('[data-month]', picker), elDur = $('[data-duration]', picker);
    var form = $('[data-booking-form]', picker);
    var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    var MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    function btn(cls, html, pressed, onClick) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.innerHTML = html;
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.addEventListener('click', onClick);
      return b;
    }
    function renderServices() {
      elServices.innerHTML = '';
      services.forEach(function (s) {
        elServices.appendChild(btn('choice', s.label, s.id === state.service, function () {
          state.service = s.id; state.day = null; state.slot = null; renderServices(); load();
        }));
      });
      var cur = services.filter(function (s) { return s.id === state.service; })[0];
      elDur.textContent = cur && cur.minutes ? 'Dauer: ' + cur.minutes + ' Min.' : '';
    }
    function renderDays() {
      elDays.innerHTML = '';
      state.days.forEach(function (d) {
        var dt = new Date(d.date + 'T12:00:00');
        var b = btn('day', '<span>' + WD[dt.getDay()] + '</span><span>' + dt.getDate() + '</span>', d.date === state.day, function () {
          state.day = d.date; state.slot = null; renderDays(); renderSlots();
        });
        b.disabled = !d.slots.length;
        elDays.appendChild(b);
      });
      var ref = state.day || (state.days[0] && state.days[0].date);
      if (ref) { var r = new Date(ref + 'T12:00:00'); elMonth.textContent = MON[r.getMonth()] + ' ' + r.getFullYear(); }
    }
    function renderSlots() {
      elSlots.innerHTML = '';
      var d = state.days.filter(function (x) { return x.date === state.day; })[0];
      var slots = d ? d.slots : [];
      elEmpty.hidden = !d || slots.length > 0;
      slots.forEach(function (t) {
        elSlots.appendChild(btn('slot', t, t === state.slot, function () {
          state.slot = t; renderSlots(); showForm();
        }));
      });
    }
    function showForm() {
      var cur = services.filter(function (s) { return s.id === state.service; })[0];
      var dt = new Date(state.day + 'T12:00:00');
      form.hidden = false;
      form.elements.service.value = state.service;
      form.elements.start.value = state.day + 'T' + state.slot;
      $('[data-summary]', form).textContent = (cur ? cur.label : '') + ' · ' + WD[dt.getDay()] + ' ' + dt.getDate() + '. ' + MON[dt.getMonth()] + ' · ' + state.slot;
      form.elements.firstName.focus();
    }
    $('[data-change-slot]', picker).addEventListener('click', function () { form.hidden = true; elSlots.focus(); });
    function load() {
      elSlots.innerHTML = ''; elDays.innerHTML = '<span class="form-note">Freie Zeiten werden geladen …</span>';
      request('GET', '/slots?service=' + encodeURIComponent(state.service) + '&days=21')
        .then(function (res) {
          if (!res.ok) throw new Error('slots');
          state.days = (res.body && res.body.days) || [];
          var first = state.days.filter(function (d) { return d.slots.length; })[0];
          state.day = first ? first.date : null;
          renderDays(); renderSlots();
        })
        .catch(function () {
          elDays.innerHTML = '<span class="form-note">Die Zeiten konnten nicht geladen werden. <a href="' + BASE + '/kontakt/">Schreib mir</a> und wir finden einen Termin.</span>';
        });
    }
    renderServices(); load();
  }
})();
