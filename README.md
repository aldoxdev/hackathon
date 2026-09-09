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

## Despliegue (Render + Vercel, ambos gratuitos)

1. **Sube este repo a GitHub** (si no lo has hecho): crea un repo vacío en github.com/new, luego:
   ```
   git remote add origin <URL-de-tu-repo>
   git push -u origin master
   ```
2. **Backend + base de datos → Render**: en [render.com](https://render.com), *New > Blueprint*, conecta este repo. Render detecta `render.yaml` y crea solo el backend (FastAPI) y una base de datos Postgres gratuita, ya conectados entre sí. Copia la URL pública que te da el backend (algo como `https://mi-cuenta-conmigo-backend.onrender.com`).
3. **Frontend → Vercel**: en [vercel.com](https://vercel.com), *Add New > Project*, importa el mismo repo. En "Root Directory" selecciona `frontend`. Antes de desplegar, agrega la variable de entorno `NEXT_PUBLIC_API_URL` con la URL del backend del paso 2. Despliega y copia la URL que te da Vercel.
4. **Conecta el backend con el frontend**: regresa a Render, entra al servicio del backend → Environment, y cambia `CORS_ORIGINS` de `http://localhost:3000` a la URL de Vercel del paso 3. Guarda (Render reinicia el servicio solo, sin redeploy de código).
5. Abre la URL de Vercel — la app ya debería funcionar en línea, con datos de ejemplo precargados automáticamente en el primer arranque.

**Nota**: el plan gratuito de Render "duerme" el backend tras 15 min sin uso — la primera visita después de una pausa puede tardar ~30-60 seg en responder mientras despierta. Es normal, no es un error.

## Alcance del MVP

Este proyecto es un MVP construido en 1-2 días de hackathon. Las limitaciones conocidas y declaradas (impuestos ISR, merma, multi-negocio, roles de usuario, conversión entre unidades) están documentadas dentro de la propia aplicación, en la sección "Alcance y limitaciones del MVP".
