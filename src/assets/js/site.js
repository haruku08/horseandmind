/* Horse & Mind – small site script. No libraries. */
(function () {
  'use strict';
  var CFG = window.HM_CONFIG || {};
  var API = (CFG.apiBase || '').replace(/\/$/, '');
  var TZ = CFG.timezone || 'Europe/Zurich';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function todayISO() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  var TODAY = todayISO();
  var params = new URLSearchParams(location.search);

  /* Mobile menu */
  var toggle = $('.nav-toggle'), nav = $('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

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
      if (cta) cta.innerHTML = '<a class="btn btn--light" href="/kids/land-der-gefuehle/">Mehr zum Camp</a>';
    }
  });

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
        showStatus(form, false, 'Testversion: Das Formular ist noch nicht mit der Buchung verbunden. Es wurde nichts gesendet.');
        return;
      }
      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      fetch(API + ENDPOINT[kind], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, body: body }; });
      }).then(function (res) {
        if (res.ok) {
          showStatus(form, true, (res.body && res.body.message) || OK_TEXT[kind]);
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
      fetch(API + '/slots?service=' + encodeURIComponent(state.service) + '&days=21')
        .then(function (r) { return r.json(); })
        .then(function (res) {
          state.days = res.days || [];
          var first = state.days.filter(function (d) { return d.slots.length; })[0];
          state.day = first ? first.date : null;
          renderDays(); renderSlots();
        })
        .catch(function () {
          elDays.innerHTML = '<span class="form-note">Die Zeiten konnten nicht geladen werden. <a href="/kontakt/">Schreib mir</a> und wir finden einen Termin.</span>';
        });
    }
    renderServices(); load();
  }
})();
