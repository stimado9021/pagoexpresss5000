# Auditoría SEO - Kredipay

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

## Gaps pendientes (aplicar cuando el dominio esté instalado)

### 1. 🔴 Sin analytics (GA4 / GTM)

**Qué es:** No hay herramienta que mida tráfico,Conversiones, comportamiento del usuario.

**Qué hacer:** Implementar Google Analytics 4 (GA4) o Google Tag Manager (GTM) en `src/app/layout.tsx`.

**Impacto:** Sin esto estás "a ciegas" — no sabes si tu página tiene tráfico ni si la gente convierte en cliente.

---

### 2. 🔴 Riesgo de URL (fallback mismatch)

**Qué es:** Verificar que el `.env` tenga `NEXT_PUBLIC_SITE_URL=https://pagoexpress-next.vercel.app` y que los fallbacks en el código coincidan.

**Qué hacer:** Cambiar todos los fallbacks en el código para que usen la variable de entorno correctamente, o actualizar el fallback al dominio correcto.

**Archivos afectados:**
- `src/app/layout.tsx` línea 21 (`metadataBase`)
- `src/app/robots.ts` línea 17
- `src/app/sitemap.ts`

**Impacto:** Si la variable no carga, canonical URLs, sitemap y metadata apuntan al dominio equivocado → contenido duplicado en Google.

---

### 3. 🟡 Sitemap incompleto

**Qué es:** El sitemap solo incluye la raíz `/`. Falta `/politica-de-datos`.

**Qué hacer:** Agregar todas las páginas públicas al sitemap en `src/app/sitemap.ts`.

**Impacto:** Google no descubre ni indexa las páginas faltantes.

---

### 4. 🟡 OG image no verificada

**Qué es:** Se referencia `/og-image.jpg` en OpenGraph y Twitter Card, pero no se verificó que exista en `public/`.

**Qué hacer:**
1. Verificar que `public/og-image.jpg` exista
2. Si no existe, crearla (1200x630px, formato JPG/PNG, < 1MB)
3. Asegurar que sea representativa del producto

**Impacto:** Cuando alguien comparte tu link en WhatsApp/LinkedIn/Facebook, aparece un cuadro vacío o feo.

---

### 5. 🟢 `sameAs` vacío en Organization JSON-LD

**Qué es:** El schema Organization tiene un array `sameAs: []` vacío.

**Qué hacer:** Agregar URLs de redes sociales en `src/app/layout.tsx` línea ~105.

**Ejemplo:**
```json
"sameAs": [
  "https://www.instagram.com/kredipay",
  "https://www.facebook.com/kredipay",
  "https://linkedin.com/company/kredipay"
]
```

**Impacto:** Google no vincula tu empresa con sus redes sociales en el Knowledge Panel.

---

### 6. 🟢 Sin `generateMetadata` (metadata dinámica)

**Qué es:** Toda la metadata es estática. No se personaliza por página.

**Qué hacer:** Implementar `generateMetadata()` en páginas que lo requieran (ej: página de préstamo específico con nombre del cliente).

**Impacto:** Mejora SEO pero no es crítico para el lanzamiento.

---

### 7. 🟢 Sin structured data en `/politica-de-datos`

**Qué es:** La página de política de datos no tiene JSON-LD.

**Qué hacer:** Agregar schema `WebPage` o `Article` con fecha de última actualización.

**Impacto:** Marginal — Google clasifica mejor el contenido con contexto semántico.

---

## Plan de acción

| # | Tarea | Prioridad | Cuándo |
|---|-------|-----------|--------|
| 1 | Instalar GA4 o GTM | 🔴 Alta | Con dominio |
| 2 | Corregir fallbacks de URL | 🔴 Alta | Con dominio |
| 3 | Completar sitemap | 🟡 Media | Con dominio |
| 4 | Crear/verificar og-image.jpg | 🟡 Media | Con dominio |
| 5 | Agregar redes sociales a sameAs | 🟢 Baja | Con dominio |
| 6 | Implementar generateMetadata donde aplique | 🟢 Baja | Post-lanzamiento |
| 7 | Agregar structured data a /politica-de-datos | 🟢 Baja | Post-lanzamiento |
