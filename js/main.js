/* ==========================================================================
   DM Bava Estudio Contable — main.js
   Navegación, acordeón FAQ, formulario → WhatsApp y medición (dataLayer/GTM).
   Sin dependencias externas. Sin credenciales de terceros en el cliente.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     CONFIGURACIÓN DEL SITIO
     ---------------------------------------------------------------------
     calendlyUrl: dejar en null mientras no exista el evento de Calendly.
     Con null, los CTAs de "reunión" apuntan a WhatsApp (ver data-calendly
     en el HTML). Al cargar la URL real acá, esos mismos CTAs pasan a abrir
     Calendly automáticamente y disparan el evento `calendly_open`.
     Ejemplo: calendlyUrl: 'https://calendly.com/dmbestudio/consulta-20-min'
     --------------------------------------------------------------------- */
  var SITE_CONFIG = {
    whatsapp: '5491128276362',
    calendlyUrl: null
  };

  window.DMB = window.DMB || {};
  window.DMB.config = SITE_CONFIG;

  /* ---------- Medición: única util de tracking (AUDITORIA §2) ---------- */
  function track(event, params) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event, page_path: location.pathname };
    if (params) {
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k) && params[k]) payload[k] = params[k];
      }
    }
    window.dataLayer.push(payload);
  }
  window.DMB.track = track;

  function waLink(text) {
    return 'https://wa.me/' + SITE_CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  window.DMB.waLink = waLink;

  /* ---------- Calendly: activar CTAs si hay URL configurada ---------- */
  function initCalendly() {
    var nodes = document.querySelectorAll('[data-calendly]');
    if (!SITE_CONFIG.calendlyUrl) return; // se quedan como CTAs de WhatsApp
    Array.prototype.forEach.call(nodes, function (el) {
      el.setAttribute('href', SITE_CONFIG.calendlyUrl);
      el.setAttribute('data-cta-type', 'calendly');
      var label = el.getAttribute('data-calendly-label');
      if (label) el.textContent = label;
    });
  }

  /* ---------- Tracking por delegación en todos los CTAs ---------- */
  function initTracking() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var location_ = a.getAttribute('data-cta') || 'sin_definir';
      var service = a.getAttribute('data-service') || '';

      if (a.getAttribute('data-cta-type') === 'calendly' || href.indexOf('calendly.com') > -1) {
        track('calendly_open', { cta_location: location_ });
      } else if (href.indexOf('wa.me') > -1) {
        track('whatsapp_click', { cta_location: location_, service_name: service });
      } else if (href.indexOf('mailto:') === 0) {
        track('email_click', { cta_location: location_ });
      } else if (href.indexOf('tel:') === 0) {
        track('phone_click', { cta_location: location_ });
      }
    }, true);

    // Calendly embebido/popup: evento de reserva confirmada (A4)
    window.addEventListener('message', function (e) {
      if (typeof e.origin === 'string' && e.origin.indexOf('calendly.com') === -1) return;
      var d = e.data;
      if (d && typeof d.event === 'string' && d.event === 'calendly.event_scheduled') {
        track('calendly_booked', { cta_location: 'calendly_widget' });
      }
    });
  }

  /* ---------- Navbar: menú mobile + link activo ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav__toggle');
    var links = document.querySelector('.nav__links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          links.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var anchors = document.querySelectorAll('.nav__links a[href^="#"]');
    if (!anchors.length || !('IntersectionObserver' in window)) return;

    var byId = {};
    Array.prototype.forEach.call(anchors, function (a) {
      byId[a.getAttribute('href').slice(1)] = a;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Array.prototype.forEach.call(anchors, function (a) { a.classList.remove('is-active'); });
        var active = byId[entry.target.id];
        if (active) active.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- FAQ: acordeón exclusivo ---------- */
  function initFaq() {
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    Array.prototype.forEach.call(items, function (item) {
      var btn = item.querySelector('.faq-q');
      var panel = item.querySelector('.faq-a');
      if (!btn || !panel) return;

      btn.addEventListener('click', function () {
        var willOpen = btn.getAttribute('aria-expanded') !== 'true';

        Array.prototype.forEach.call(items, function (other) {
          var b = other.querySelector('.faq-q');
          var p = other.querySelector('.faq-a');
          if (!b || !p) return;
          b.setAttribute('aria-expanded', 'false');
          p.hidden = true;
          var i = b.querySelector('.icon');
          if (i) i.textContent = '+';
        });

        if (willOpen) {
          btn.setAttribute('aria-expanded', 'true');
          panel.hidden = false;
          var icon = btn.querySelector('.icon');
          if (icon) icon.textContent = '−';
          track('faq_open', { question: btn.getAttribute('data-q') || btn.textContent.trim().slice(0, 80) });
        }
      });
    });
  }

  /* ---------- Formulario de contacto → WhatsApp (sin backend) ---------- */
  function initForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    var status = document.getElementById('formStatus');
    var enviosEnSesion = 0;

    function say(msg, kind) {
      if (!status) return;
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot (S5): si viene con valor, es un bot. Se descarta en silencio.
      var hp = form.querySelector('[name="website"]');
      if (hp && hp.value.trim() !== '') return;

      // Límite simple de envíos por sesión (S5)
      if (enviosEnSesion >= 3) {
        say('Ya enviaste varias consultas. Escribime directamente por WhatsApp.', 'error');
        return;
      }

      var nombre = (form.elements.nombre.value || '').trim();
      var servicio = (form.elements.servicio.value || '').trim();
      var mensaje = (form.elements.mensaje.value || '').trim();

      if (nombre.length < 2) {
        say('Dejame tu nombre (y empresa, si corresponde) para poder responderte.', 'error');
        form.elements.nombre.focus();
        return;
      }
      if (mensaje.length < 5) {
        say('Contame brevemente tu consulta así te respondo con algo concreto.', 'error');
        form.elements.mensaje.focus();
        return;
      }

      var texto = 'Hola Daniela, soy ' + nombre + '. Me interesa: ' +
        (servicio || 'una consulta general') + '. ' + mensaje;

      enviosEnSesion++;
      track('form_submit', {
        cta_location: 'contact_form',
        service_name: servicio || 'sin_especificar'
      });

      say('Listo: se abre WhatsApp con tu mensaje ya escrito.', 'ok');
      window.open(waLink(texto), '_blank', 'noopener');
    });
  }

  /* ---------- Init ---------- */
  function init() {
    initCalendly();
    initTracking();
    initNav();
    initFaq();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
