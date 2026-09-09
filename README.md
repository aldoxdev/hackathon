# App de gestión financiera para restaurantes

Proyecto de hackathon. Software para restaurantes pequeños que registra ventas, insumos y gastos fijos, y muestra al dueño la salud financiera de su negocio con indicadores reales de rentabilidad, presentados de forma sencilla de entender.

## Qué resuelve

- Costeo real de recetas (cuánto cuesta realmente cada platillo en insumos)
- Indicadores financieros: food cost %, margen de contribución, punto de equilibrio, rentabilidad neta, análisis ABC de platillos
- Estado de Resultados formal, útil para presentar ante una entidad de financiamiento
- Trazabilidad de movimientos en efectivo vs. banco
- Carga masiva de datos vía Excel

## Stack

- **Backend**: Python + FastAPI
- **Frontend**: Next.js + Tailwind CSS
- **Base de datos**: PostgreSQL
- **Hosting**: Render (plan gratuito)

## Estructura del proyecto

```
├── backend/     — API en FastAPI
├── frontend/    — Interfaz en Next.js
├── docs/
│   ├── resumen_analisis_app_restaurantes.md   — análisis completo de diseño
│   └── bitacora_decisiones.md                  — registro de decisiones tomadas
└── CLAUDE.md    — contexto para retomar el desarrollo con Claude Code
```

## Cómo se construyó

El diseño y modelo de datos se definieron en una sesión de análisis previa a escribir código (ver `docs/resumen_analisis_app_restaurantes.md`), con apoyo de Claude (Anthropic) tanto en la fase de diseño como en la de desarrollo. El detalle de cada decisión y su justificación está en `docs/bitacora_decisiones.md`.

## Despliegue (todo en Render, gratuito)

El frontend es 100% estático (`next.config.ts` tiene `output: "export"`) — no usa rutas de API propias de Next.js ni componentes de servidor con datos dinámicos, todo el fetching es del lado del cliente hacia el backend de FastAPI. Por eso se puede hospedar como sitio estático en el mismo Render que el backend, sin necesitar un servidor Node.

1. **Sube este repo a GitHub** (si no lo has hecho): crea un repo vacío en github.com/new, luego:
   ```
   git remote add origin <URL-de-tu-repo>
   git push -u origin main
   ```
2. En [render.com](https://render.com), *New > Blueprint*, conecta este repo. Render detecta `render.yaml` y crea automáticamente: una base de datos Postgres gratuita, el backend (FastAPI) y el frontend (sitio estático de Next.js) — los tres ya conectados entre sí.
3. Espera a que los tres terminen de desplegar (unos minutos). Abre la URL del servicio `mi-cuenta-conmigo-frontend` — la app ya debería funcionar en línea, con datos de ejemplo precargados automáticamente en el primer arranque.
4. **Último paso manual**: entra al servicio `mi-cuenta-conmigo-backend` → Environment, y cambia `CORS_ORIGINS` de `http://localhost:3000` a la URL del frontend (paso 3). Guarda (Render reinicia el servicio solo, sin redeploy de código).

**Nota**: el plan gratuito de Render "duerme" el backend tras 15 min sin uso — la primera visita después de una pausa puede tardar ~30-60 seg en responder mientras despierta. El sitio estático del frontend no tiene este problema (se sirve al instante).

## Alcance del MVP

Este proyecto es un MVP construido en 1-2 días de hackathon. Las limitaciones conocidas y declaradas (impuestos ISR, merma, multi-negocio, roles de usuario, conversión entre unidades) están documentadas dentro de la propia aplicación, en la sección "Alcance y limitaciones del MVP".
