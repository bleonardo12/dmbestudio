/* ==========================================================================
   Calculadora de categoría de Monotributo
   La escala vive en /data/monotributo-escala.json (fuente única, se actualiza
   semestralmente). Este archivo sólo contiene la lógica.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-calculadora]');
  if (!root) return;

  var ESCALA_URL = '/data/monotributo-escala.json';

  var els = {
    monto: root.querySelector('#calcMonto'),
    toggles: root.querySelectorAll('.toggle[data-actividad]'),
    resultado: root.querySelector('#calcResultado'),
    categoria: root.querySelector('#calcCategoria'),
    cuota: root.querySelector('#calcCuota'),
    margen: root.querySelector('#calcMargen'),
    nota: root.querySelector('#calcNota'),
    wa: root.querySelector('#calcWa'),
    error: root.querySelector('#calcError'),
    vigencia: root.querySelectorAll('[data-vigencia]')
  };

  var escala = null;
  var soloBienes = [];
  var vigenciaTexto = '';
  var estado = { monto: 0, actividad: 'servicios' };
  var trackTimer = null;
  var ultimoTrackeado = '';

  var track = (window.DMB && window.DMB.track) || function () {};
  var waLink = (window.DMB && window.DMB.waLink) || function (t) {
    return 'https://wa.me/5491128276362?text=' + encodeURIComponent(t || '');
  };

  function fmt(n) {
    return '$ ' + Math.round(n).toLocaleString('es-AR');
  }

  function parseMonto(s) {
    var d = (s || '').replace(/[^\d]/g, '');
    return d ? parseInt(d, 10) : 0;
  }

  /* ---------- Carga de la escala ---------- */
  fetch(ESCALA_URL, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      escala = data.categorias;
      soloBienes = data.soloVentaDeBienes || [];
      vigenciaTexto = data.vigenciaTexto || '';
      Array.prototype.forEach.call(els.vigencia, function (el) {
        if (vigenciaTexto) el.textContent = 'Fuente: ' + (data.fuente || 'ARCA') + ' · escala ' + vigenciaTexto;
      });
      calcular(); // por si el usuario ya escribió antes de que cargara la escala
    })
    .catch(function () {
      if (els.error) {
        els.error.textContent = 'No pudimos cargar la escala vigente. Escribime por WhatsApp y lo vemos juntos.';
        els.error.hidden = false;
      }
    });

  /* ---------- Cálculo ---------- */
  // Las categorías I, J y K son exclusivas de venta de bienes muebles:
  // en prestación de servicios el tope del régimen es la categoría H.
  function buscarCategoria(monto, actividad) {
    for (var i = 0; i < escala.length; i++) {
      var cat = escala[i];
      if (actividad === 'servicios' && soloBienes.indexOf(cat[0]) > -1) continue;
      if (monto <= cat[1]) return cat;
    }
    return null;
  }

  function calcular() {
    if (!escala || !els.resultado) return;

    if (estado.monto <= 0) {
      els.resultado.hidden = true;
      return;
    }

    var esServicios = estado.actividad === 'servicios';
    var cat = buscarCategoria(estado.monto, estado.actividad);
    var claveTrack;

    if (cat) {
      els.categoria.textContent = cat[0];
      els.cuota.textContent = fmt(esServicios ? cat[2] : cat[3]) + ' / mes';
      els.margen.textContent = fmt(cat[1] - estado.monto);
      els.nota.textContent = 'Estimación con la escala ' + (vigenciaTexto || 'vigente') + ' para ' +
        (esServicios ? 'prestación de servicios' : 'venta de bienes') +
        '. Verificá también superficie, energía y alquileres.';
      els.wa.href = waLink('Hola Daniela, usé la calculadora y me da categoría ' + cat[0] +
        ' con una facturación anual de ' + fmt(estado.monto) + '. Quiero revisar mi situación.');
      els.wa.setAttribute('data-service', 'monotributo_categoria_' + cat[0]);
      claveTrack = cat[0] + '|' + estado.actividad;
    } else {
      var ultima = esServicios ? 'H (la última categoría habilitada para servicios)' : 'K';
      els.categoria.textContent = 'R.I.';
      els.cuota.textContent = '—';
      els.margen.textContent = 'Superaste el tope de la categoría ' + ultima;
      els.nota.textContent = 'Con esa facturación quedás fuera del monotributo: corresponde el Régimen ' +
        'General (Responsable Inscripto: IVA + Ganancias). Es exactamente el escenario donde más te ' +
        'conviene una buena planificación.';
      els.wa.href = waLink('Hola Daniela, mi facturación supera el tope del monotributo y quiero ' +
        'asesorarme para pasar a Responsable Inscripto.');
      els.wa.setAttribute('data-service', 'monotributo_responsable_inscripto');
      claveTrack = 'RI|' + estado.actividad;
    }

    els.resultado.hidden = false;

    // Micro-conversión: se dispara al estabilizarse el resultado, una vez por combinación
    clearTimeout(trackTimer);
    trackTimer = setTimeout(function () {
      if (claveTrack === ultimoTrackeado) return;
      ultimoTrackeado = claveTrack;
      track('calc_monotributo', {
        categoria: cat ? cat[0] : 'RI',
        actividad: estado.actividad,
        cta_location: 'calculadora'
      });
    }, 900);
  }

  /* ---------- Eventos ---------- */
  if (els.monto) {
    els.monto.addEventListener('input', function () {
      var n = parseMonto(els.monto.value);
      estado.monto = n;
      els.monto.value = n ? '$ ' + n.toLocaleString('es-AR') : '';
      calcular();
    });
  }

  Array.prototype.forEach.call(els.toggles, function (btn) {
    btn.addEventListener('click', function () {
      estado.actividad = btn.getAttribute('data-actividad');
      Array.prototype.forEach.call(els.toggles, function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      calcular();
    });
  });
})();
