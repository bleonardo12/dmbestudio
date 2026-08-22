# Medición — dmbestudio.com

Especificación de eventos, configuración de Google Tag Manager y conversiones de
Google Ads. Implementa el punto §2 de la auditoría (A1–A6).

Contenedor GTM: **GTM-K26768CX** (ya instalado en `<head>` y `<body>` de todas las páginas).

---

## 1. Eventos que envía el sitio

Todos los eventos salen de una única función `track()` en [js/main.js](js/main.js), que
pushea al `dataLayer` nativo de GTM. Cada push incluye siempre `page_path`.

```js
track('whatsapp_click', { cta_location: 'hero' });
```

| Evento | Cuándo se dispara | Parámetros |
|---|---|---|
| `whatsapp_click` | Clic en cualquier link `wa.me` del sitio | `cta_location`, `service_name` (sólo en cards de servicio y CTAs de nota) |
| `calendly_open` | Clic en un CTA de agenda **cuando Calendly esté activado** | `cta_location` |
| `calendly_booked` | `postMessage` `calendly.event_scheduled` (reserva confirmada) | `cta_location: 'calendly_widget'` |
| `email_click` | Clic en un link `mailto:` | `cta_location` |
| `phone_click` | Clic en un link `tel:` | `cta_location` |
| `calc_monotributo` | La calculadora devuelve un resultado estable (900 ms sin cambios), una vez por combinación categoría+actividad | `categoria`, `actividad`, `cta_location` |
| `form_submit` | Envío válido del formulario de contacto (abre WhatsApp) | `cta_location: 'contact_form'`, `service_name` |
| `faq_open` | Apertura de una pregunta del acordeón | `question` |

### Valores de `cta_location`

`navbar` · `hero` · `service_card` · `calculadora` · `calculadora_pagina` ·
`calculadora_cta_final` · `sobre_mi` · `faq` · `contacto` · `contact_form` ·
`nota` · `notas_listado` · `float`

### Valores de `service_name`

`balances` · `ganancias_sociedades` · `ganancias_bienes_personales` ·
`planificacion_fiscal` · `auditoria` · `pericia` · `monotributo` ·
`monotributo_revision` · `monotributo_categoria_<A-K>` · `monotributo_responsable_inscripto`

> Para agregar tracking a un CTA nuevo alcanza con ponerle `data-cta="…"` (y
> `data-service="…"` si aplica). El listener está delegado en `document`, no hay
> que tocar JS.

---

## 2. Qué crear en GTM (A1)

### Variables (Variables → Nueva → Variable de capa de datos)

Crear una por cada parámetro, con el mismo nombre:
`cta_location`, `service_name`, `page_path`, `categoria`, `actividad`, `question`.

### Activadores (Triggers → Nuevo → Evento personalizado)

Uno por evento, con el nombre exacto de la tabla de arriba:
`whatsapp_click`, `calendly_open`, `calendly_booked`, `email_click`,
`phone_click`, `calc_monotributo`, `form_submit`, `faq_open`.

### Etiquetas (Tags)

1. **GA4 Configuration** — ID de medición `G-XXXXXXX`, activador *All Pages*.
   (Si todavía no existe la propiedad GA4, crearla primero en Google Analytics.)
2. **GA4 Event** — una por evento. Nombre del evento = nombre del activador,
   parámetros = las variables de capa de datos correspondientes.
3. **Conversion Linker** — activador *All Pages*, "habilitar en todos los dominios".
   Sin esto Google Ads no puede atribuir las conversiones.
4. **Google Ads Conversion Tracking** — una etiqueta por conversión importada
   (ver punto 3), con el ID y la etiqueta que da Google Ads.

### Orden de publicación

Publicar primero GA4 Configuration + Conversion Linker, verificar en *Preview*
que los eventos aparezcan en el `dataLayer`, y recién después las etiquetas de
conversión.

---

## 3. Conversiones a importar en Google Ads (A2)

| Conversión en Ads | Evento de origen | Tipo | Valor |
|---|---|---|---|
| `whatsapp_click` | `whatsapp_click` (todos los `cta_location`) | Principal | sin valor / valor estimado por lead |
| `form_submit` | `form_submit` | Principal | igual que arriba |
| `calendly_booked` | `calendly_booked` | Principal | activar cuando exista Calendly |
| `calculadora_usada` | `calc_monotributo` | **Secundaria** (micro-conversión) | sin valor |

`calc_monotributo` debe quedar como conversión **secundaria**: sirve para
observar y para audiencias de remarketing, pero no para que Ads optimice pujas
(es demasiado barata y desviaría el gasto).

### Audiencias de remarketing sugeridas

- Usó la calculadora y no clickeó WhatsApp (`calc_monotributo` sin `whatsapp_click`).
- Leyó una nota (`page_path` empieza con `/notas/`).
- Visitó `/calculadora-monotributo/`.

---

## 4. Consent Mode v2 (A6)

Cada página define los defaults **antes** del snippet de GTM:

- **Región UE/EEE/UK/CH:** todo `denied` salvo `functionality_storage` y
  `security_storage`, con `wait_for_update: 500`.
- **Resto del mundo (incluida Argentina):** todo `granted`.

No hay banner de cookies porque Argentina no lo exige y el tráfico objetivo es
local. Si en algún momento se agrega un CMP, sólo tiene que llamar a
`gtag('consent', 'update', {...})`; los defaults ya están puestos.

---

## 5. Verificación tras cada deploy

1. Abrir el sitio con **GTM Preview** (Tag Assistant).
2. Clickear un CTA de WhatsApp del hero → debe aparecer `whatsapp_click` con
   `cta_location: hero`.
3. Clickear "Consultar este servicio" en Balances → `whatsapp_click` con
   `service_name: balances`.
4. Escribir `25000000` en la calculadora → a los ~1 s, `calc_monotributo` con
   `categoria: D`.
5. Enviar el formulario con datos válidos → `form_submit` y apertura de WhatsApp.
6. En GA4 → *Tiempo real* verificar que los eventos lleguen.

---

## 6. Estado real del contenedor (auditoría 22/08/2026)

Inspección del contenedor publicado `GTM-K26768CX`. **Contiene tres etiquetas:**

| Tag | Tipo | Destino | Estado |
|---|---|---|---|
| 7 | Google Tag (GA4 config) | `G-XP8MD59TFT` | Activa |
| 8 | GA4 Event | `whatsapp_click` | Activa |
| 9 | GA4 Event | `generate_lead` | Activa, **origen desconocido** |
| — | Google Ads Conversion (`AW-…`) | — | **No existe** |
| — | Conversion Linker | — | **No existe** |
| — | Ads Remarketing | — | **No existe** |

Consecuencias:

- **Google Ads no recibe ninguna conversión.** Cualquier estrategia de Puja
  Inteligente (Maximizar conversiones, CPA objetivo, ROAS objetivo) está
  optimizando sin señal. Sin `Conversion Linker`, además, Ads no podría atribuir
  las conversiones ni cuando se creen.
- De los 8 eventos que el sitio pushea al `dataLayer`, **sólo `whatsapp_click`
  tiene etiqueta**. `form_submit`, `calc_monotributo`, `faq_open`, `email_click`,
  `phone_click`, `calendly_open` y `calendly_booked` se emiten y nadie los
  escucha. La calculadora —el imán de tráfico del sitio— no genera ni un dato.
- La etiqueta `generate_lead` no corresponde a ningún evento del sitio: se
  dispara con un activador nativo de GTM (probablemente detección automática de
  envío de formulario). Revisar de qué se cuelga antes de conectar `form_submit`,
  o va a haber doble conteo.

## 7. Pendientes de configuración manual (fuera del código)

- [x] ~~Crear propiedad GA4~~ — ya existe y está activa: `G-XP8MD59TFT`.
- [ ] **Publicar el `Conversion Linker`** (activador *All Pages*) — antes que
      cualquier etiqueta de conversión.
- [ ] **Crear las conversiones en Google Ads e importarlas** (punto 3).
- [ ] Conectar los 7 eventos restantes: 8 activadores de evento personalizado y
      6 variables de capa de datos (punto 2).
- [ ] Auditar el activador de la etiqueta `generate_lead`.
- [ ] Crear el evento de Calendly y cargar la URL en `SITE_CONFIG.calendlyUrl`
      ([js/main.js](js/main.js)) — con eso los CTAs de agenda dejan de ir a
      WhatsApp y empiezan a emitir `calendly_open`.
- [ ] Reenviar el sitemap en Search Console tras el deploy.
- [ ] Crear/actualizar el Google Business Profile y agregar la URL en `sameAs`
      del schema `AccountingService` de [index.html](index.html).
- [ ] Landing pages por campaña (`/balances`, `/ganancias`, `/bienes-personales`)
      si se activan campañas segmentadas (A8).
