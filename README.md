# DM Bava Estudio Contable — dmbestudio.com

Sitio del estudio contable de **Daniela Magalí Bava**, Contadora Pública Nacional
(CPCECABA, Buenos Aires). Posicionado en **PyMEs y empresas**: balances, Impuesto
a las Ganancias (sociedades y personas humanas) y Bienes Personales. El
monotributo queda como servicio secundario, con una calculadora de categoría como
imán de tráfico.

**Conversión primaria:** WhatsApp. **Secundaria:** reunión agendada.

---

## Stack

Sitio **estático**, sin build, sin frameworks y sin dependencias de terceros en el
cliente. HTML + CSS + JavaScript vanilla.

- Tipografía **Space Grotesk** self-hosteada (`/fonts`, `font-display: swap`).
- Sin Bootstrap, sin Bootstrap Icons, sin Google Fonts, sin EmailJS.
- Único script de terceros: **Google Tag Manager** (`GTM-K26768CX`).

---

## Estructura

```
dmbestudio/
├── index.html                        # Home (una página con anclas)
├── calculadora-monotributo/
│   └── index.html                    # Página propia de la calculadora (SEO)
├── privacidad/index.html             # Política de privacidad (requisito de Google Ads)
├── notas/                            # Blog indexable
│   ├── index.html                    # Listado
│   ├── recategorizacion-monotributo-agosto-2026/
│   ├── bienes-personales-como-anticiparse/
│   └── cierre-de-balance-checklist-pymes/
├── css/styles.css                    # Toda la hoja de estilos
├── js/
│   ├── main.js                       # Config, nav, FAQ, formulario, track()
│   └── calculadora.js                # Lógica de la calculadora
├── data/monotributo-escala.json      # Escala ARCA (actualización semestral)
├── fonts/                            # Space Grotesk woff2
├── img/                              # Foto + og-image
├── nginx/                            # Cabeceras de seguridad para el VPS
├── _headers                          # Equivalente para Netlify/Cloudflare
├── MEDICION.md                       # Eventos, GTM y conversiones de Ads
├── robots.txt · sitemap.xml · manifest.json · favicon.svg
└── .github/workflows/deploy.yml      # Deploy automático al VPS
```

---

## Deploy

Automático: **push a `main` → GitHub Actions → SSH al VPS → `git checkout -B main origin/main`
+ `git reset --hard origin/main`** en `/var/www/dmbestudio`. No hay build ni paso manual.

El `checkout -B` fuerza que el working tree del VPS quede siempre **en `main`**:
antes quedaba apuntado a una rama vieja y sólo funcionaba de casualidad, porque
el `reset --hard` la reescribía en cada deploy. El workflow además tiene un
`concurrency` group, así que dos pushes seguidos no pisan el mismo directorio.

```bash
git add -A && git commit -m "…" && git push
```

> El deploy **no toca la configuración de nginx**. Las cabeceras de seguridad se
> aplican una sola vez siguiendo las instrucciones de
> [nginx/security-headers.conf](nginx/security-headers.conf).

---

## Mantenimiento

### Actualizar la escala del monotributo (cada semestre)

ARCA publica valores nuevos habitualmente en **enero y agosto**. Hay que tocar
dos lugares:

1. [data/monotributo-escala.json](data/monotributo-escala.json) — filas de
   `categorias`, más `vigenciaDesde` y `vigenciaTexto`.
2. La tabla estática de [calculadora-monotributo/index.html](calculadora-monotributo/index.html)
   (está duplicada a propósito: se sirve en HTML para que Google la indexe).

También conviene actualizar la mención "vigente desde el 1/8/2026" en el texto de
la home y de la página de la calculadora.

### Activar Calendly

En [js/main.js](js/main.js), `SITE_CONFIG.calendlyUrl`. Mientras esté en `null`,
todos los CTAs de "Agendar reunión" abren WhatsApp. Al cargar la URL real, esos
mismos botones pasan a abrir Calendly y a emitir el evento `calendly_open` — no
hay que tocar el HTML.

### Al tocar CSS o JS: bumpear la versión

Los assets se sirven con cache larga en nginx, así que las referencias del HTML
llevan un query string de versión: `/css/styles.css?v=20260822`. **Después de
editar `css/styles.css`, `js/main.js` o `js/calculadora.js` hay que reemplazar
ese valor en todos los `.html`**, si no los visitantes recurrentes siguen viendo
la versión cacheada:

```bash
grep -rl 'v=20260822' --include='*.html' . | xargs sed -i 's/v=20260822/v=AAAAMMDD/g'
```

### Cambiar el número de WhatsApp

Está en `SITE_CONFIG.whatsapp` ([js/main.js](js/main.js)) para lo que genera el
JS, y hardcodeado en los `href` de los CTAs del HTML (para que funcionen sin
JavaScript). Si cambia, hay que buscar y reemplazar `5491128276362` en todo el repo.

### Agregar una nota al blog

1. Copiar una carpeta existente de `notas/` y renombrarla con el slug nuevo.
2. Actualizar title, description, canonical, OG, el schema `Article` y el contenido.
3. Agregar la card en [notas/index.html](notas/index.html) y —si va destacada— en
   la sección `#notas` de [index.html](index.html).
4. Sumar la URL a [sitemap.xml](sitemap.xml).

---

## Medición

Ver **[MEDICION.md](MEDICION.md)**: eventos del `dataLayer`, qué crear en GTM y
qué conversiones importar en Google Ads.

Para trackear un CTA nuevo alcanza con agregarle `data-cta="…"` (y
`data-service="…"` si aplica). El listener está delegado, no hay que tocar JS.

---

## Seguridad

- Sin credenciales de terceros en el cliente (el formulario abre WhatsApp, no usa backend).
- Todos los `target="_blank"` llevan `rel="noopener noreferrer"`.
- Honeypot + límite de envíos por sesión en el formulario.
- Sin `console.log` en producción.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`
  en [nginx/security-headers.conf](nginx/security-headers.conf).
- `/.git`, `/.github`, `/nginx` y los `.md` devuelven 404 desde nginx
  ([nginx/dmbestudio.conf](nginx/dmbestudio.conf)). Se excluye `/.well-known`
  para no romper la renovación de Let's Encrypt.

> **El repositorio de GitHub es público.** Mientras lo sea, bloquear `/.git` en
> nginx es defensa en profundidad, no confidencialidad: el código y todo el
> historial se leen igual desde GitHub. El commit `585dbc8` dejó en el historial
> las IDs de EmailJS (`service_sqh0r9p` / `template_nkjdqq9` /
> `ZVip-2JVyka3hVGj7`); el servicio ya no se usa y conviene **borrarlo desde el
> panel de EmailJS**, porque con esos tres valores cualquiera puede enviar mails
> a través de esa cuenta.

---

## Desarrollo local

El sitio usa rutas absolutas (`/css/…`) y la calculadora hace `fetch` del JSON,
así que **no funciona abriendo `index.html` con doble clic**. Hay que servirlo:

```bash
npx serve .        # o python -m http.server 8000
```

---

© 2026 DM Bava Estudio Contable
