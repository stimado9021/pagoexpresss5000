# Auditoría SEO - Kreditools

## Estado actual (lo que ya está bien)

| Elemento | Archivo | Línea |
|----------|---------|-------|
| Metadata raíz (title, description, keywords, OpenGraph, Twitter) | `src/app/layout.tsx` | 20 |
| Canonical URLs | `src/app/layout.tsx`, `src/app/politica-de-datos/page.tsx` | 74, 7 |
| robots.txt (con reglas para AI crawlers) | `src/app/robots.ts` | — |
| Sitemap | `src/app/sitemap.ts` | — |
| JSON-LD (Organization, WebSite, SoftwareApplication) | `src/app/layout.tsx` | 93-135 |
| FAQ Schema en landing page | `src/app/page.tsx` | 43-56 |
| Bloqueo de indexación en dashboards privados | 6 layouts (vendedor, login, admin, etc.) | — |
| `lang="es"` | `src/app/layout.tsx` | 89 |

---

## Correcciones aplicadas (2026-10-06)

### ✅ 1. Unificación canónica www ↔ apex (era el bloqueador #1 de indexación)

**Problema:** sitemap y canonical apuntaban a `www`, JSON-LD a apex, y ambas
versiones servían el mismo contenido con 200 (contenido duplicado).

**Solución:**
- `src/proxy.ts`: redirect **308 permanente** de la versión no canónica a la
  canónica (ambas direcciones soportadas; la canónica la define `SITE_URL`).
  Se excluye `/api/*` para no romper webhooks de Stripe/Wompi.
- `src/app/layout.tsx`: JSON-LD ahora usa `SITE_URL` en vez de URLs
  hardcodeadas + sanitización `.replace(/</g, '\\u003c')` según docs Next.js.
- `.env.example`: `NEXT_PUBLIC_SITE_URL="https://www.kreditools.shop"` (canónico).

### ✅ 2. Blog 100% CSR → Server Components con SSR

**Problema:** `/blog` y `/blog/[slug]` eran `'use client'` con `fetch` en
`useEffect` (HTML inicial = spinner vacío) y leían de la DB mientras el
sitemap anunciaba slugs estáticos.

**Solución:**
- `src/app/blog/page.tsx`: Server Component que renderiza `POSTS` de
  `src/lib/blog.ts` en el HTML + `metadata` con canonical.
- `src/app/blog/[slug]/page.tsx`: Server Component con `generateStaticParams`,
  `generateMetadata` por artículo (canonical + OpenGraph `article`) y JSON-LD
  `Article`. CTA roto `/register` corregido a `/#registro`.
- Las rutas `/api/blog*` se conservan intactas (por si el admin las usa).

### ✅ 3. `og-image.jpg` creada

**Problema:** referenciada en OpenGraph/Twitter pero devolvía 404.

**Solución:** `public/og-image.jpg` generada (1200x630, ~75KB < 1MB) con logo,
tagline y acento lime de marca.

### ✅ 4. Structured data en `/terminos` y `/politica-de-datos`

Agregado JSON-LD `WebPage` con `dateModified`, `inLanguage: es-CO` y publisher.

### ✅ 5. GA4 listo para activar

**Solución:** `src/components/GoogleAnalytics.tsx` (inyecta gtag solo si existe
`NEXT_PUBLIC_GA_ID`) + variable documentada en `.env.example`. Falta que el
usuario cree la propiedad en analytics.google.com y configure el ID en Vercel.

---

## Gaps pendientes

### 1. 🟢 `sameAs` vacío en Organization JSON-LD

**Qué hacer:** cuando existan, agregar URLs reales de redes sociales en
`src/app/layout.tsx` (objeto `jsonLd`). No inventar URLs que no existan.

### 2. 🔴 Acción manual en Google Search Console (fuera del código)

1. Verificar propiedad `www.kreditools.shop` (ya existe archivo de verificación
   `public/google794ff476c1c96373.html`).
2. Enviar sitemap: `https://www.kreditools.shop/sitemap.xml`.
3. Inspeccionar URL `/` → **Solicitar indexación**.
4. Repetir "Solicitar indexación" para `/blog` y 1-2 posts.
5. Revisar informe Páginas a los 3-7 días.

---

## Plan de acción

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | Redirect canónico apex↔www (308) | 🔴 Alta | ✅ Hecho |
| 2 | JSON-LD con SITE_URL | 🔴 Alta | ✅ Hecho |
| 3 | Blog SSR + metadata + Article schema | 🔴 Alta | ✅ Hecho |
| 4 | Crear og-image.jpg | 🟡 Media | ✅ Hecho |
| 5 | Structured data en terminos/politica | 🟢 Baja | ✅ Hecho |
| 6 | Componente GA4 condicional | 🟡 Media | ✅ Hecho (falta ID real) |
| 7 | Agregar redes sociales a sameAs | 🟢 Baja | ⏳ Cuando existan |
| 8 | Enviar sitemap + solicitar indexación en GSC | 🔴 Alta | ⏳ Manual (usuario) |
