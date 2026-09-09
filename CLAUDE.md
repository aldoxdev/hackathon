# Contexto del proyecto — App de gestión financiera para restaurantes

Proyecto de hackathon (1-2 días). Antes de escribir código, lee `docs/resumen_analisis_app_restaurantes.md` — ahí está el análisis completo y detallado. Este archivo es solo el resumen ejecutivo para orientarte rápido.

## Qué es la app

Software para un restaurante pequeño (menú variado, no una taquería) que registra ventas, insumos (costeo de recetas) y gastos fijos, y muestra indicadores financieros reales de forma sencilla: food cost %, margen de contribución, punto de equilibrio, rentabilidad neta, análisis ABC de platillos, y un Estado de Resultados formal (pensado para poder presentarse ante una entidad de financiamiento).

## Stack

- Backend: Python + FastAPI
- Frontend: Next.js + Tailwind CSS
- Base de datos: PostgreSQL
- Hosting: Render (plan gratuito, backend + frontend + base de datos)

## Reglas de diseño que ya están decididas (no las reabras sin avisar)

- **Unidades**: 3 magnitudes (masa→gramos, volumen→mililitros, pieza→pieza). Sin onzas/libras. Nunca se convierte entre magnitudes distintas.
- **Insumos directos vs. indirectos**: los indirectos (cebolla de mesa, salsas de mesa, servilletas, gas) NUNCA tienen receta propia — su costo se captura manualmente, no se calcula desde una compra.
- **Recetas editables**: sin importar si se crearon por Excel o manualmente, se editan igual desde la misma pantalla.
- **Snapshot de costos**: `VENTAS.costo_insumos_snapshot` congela el costo al momento de la venta — nunca recalcular ventas pasadas si cambia el precio de un insumo.
- **Periodo estándar**: mensual, para todos los acumulados.
- **Un solo usuario** (el dueño), sin roles, sin multi-negocio (decisión de alcance para el hackathon).
- **IVA**: se etiqueta cada receta y gasto fijo (iva_16 / iva_0 / exento / no_objeto). El cálculo de ISR bajo RESICO queda fuera del MVP.
- **UX**: interfaz del constructor de recetas debe ser extremadamente simple (nunca se elige unidad manualmente). Íconos de ayuda con explicaciones en lenguaje llano junto a cada término técnico. Sección de glosario. Checklist de primeros pasos en el dashboard. Diseño responsivo (mobile-first).
- **Datos demo**: deben estar curados para mostrar un negocio rentable (utilidad neta positiva, food cost % saludable). Debe existir botón de reset/reseed.
- **Excel de carga masiva**: 5 hojas (Insumos, Recetas, Receta_Insumos, Ventas, Gastos_Fijos), referencias por nombre, orden de importación importa.

## Nota interna (NO exponer en la app ni en el roadmap público de limitaciones)

Se está evaluando agregar interacción por audio (transcripción con API de OpenAI, o alternativamente Web Speech API del navegador como opción gratuita) como función adicional tipo stretch goal. Esto es una nota de planeación interna del equipo — no debe aparecer listada en la pantalla "Alcance y limitaciones del MVP" que sí es pública dentro de la app.

## Roadmap de limitaciones (esto SÍ va en una pantalla visible dentro de la app)

Ver la sección correspondiente en `docs/resumen_analisis_app_restaurantes.md` (sección 12). Resumen: ISR/RESICO, merma/desperdicio, multi-negocio, roles de usuario, conversión entre magnitudes — todos excluidos del MVP y declarados así al usuario.

## Mantenimiento de la documentación

Cada vez que se tome una decisión de diseño o arquitectura importante durante el desarrollo, agrégala a `docs/bitacora_decisiones.md` con fecha, decisión y motivo — es evidencia del proceso para la evaluación del hackathon.
