# Resumen de análisis — App de gestión financiera para restaurantes
### Proyecto de hackathon

---

## 1. Objetivo del producto

Aplicación para pequeños negocios (orientada a restaurantes) que permite registrar:
- Ingresos por ventas
- Gastos de insumos (costeo de recetas)
- Gastos fijos (nómina, luz, renta, etc.)

Y que, a partir de esos datos, muestra al dueño del negocio la **salud financiera real** de su empresa con indicadores serios de finanzas, presentados de forma sencilla de entender — no simplificados de más.

**Restricciones del equipo:**
- Tiempo de desarrollo: 1-2 días de hackathon
- Ningún integrante del equipo tiene experiencia técnica avanzada
- Presupuesto: $0 (hosting y herramientas gratuitas)

---

## 2. Modelo de unidades de medida

Se definieron **3 magnitudes**, cada una con su unidad base fija (evita que el usuario tenga que elegir o convertir unidades manualmente):

| Magnitud | Unidad base | Unidades de compra permitidas |
|---|---|---|
| Masa | gramos (g) | g, kg |
| Volumen | mililitros (ml) | ml, L |
| Pieza | pieza | pieza |

- Solo se usan unidades métricas de México (sin onzas ni libras)
- **No se convierte entre magnitudes distintas** (ej. no volumen a masa) — evita necesitar datos de densidad por ingrediente

---

## 3. Insumos: directos vs. indirectos

| Tipo | Definición | Ejemplo | Costo por unidad |
|---|---|---|---|
| **Directo** | Medible exactamente por platillo | Carne de pastor, tortilla | Calculado automáticamente (precio de compra ÷ cantidad) |
| **Indirecto** | De uso general, no medible por platillo | Cebolla y cilantro de mesa, salsas picantes de mesa, servilletas, gas | Capturado **manualmente** por el usuario (sin desglosar receta propia) |

**Regla clave**: los insumos indirectos **nunca tienen receta propia** — se evita la complejidad de recetas anidadas. El usuario simplemente declara un costo de referencia y registra el gasto total periódico.

---

## 4. Interfaz de recetas (requisito de máxima prioridad)

La pantalla para armar/editar una receta debe ser **extremadamente fácil**:
- El usuario selecciona el insumo de una lista — la unidad correcta aparece sola (nunca elige unidad manualmente)
- El costo total del platillo y el food cost % se recalculan **en tiempo real** conforme se agregan insumos
- El food cost % se muestra con semáforo de color (verde/amarillo/rojo) según rango saludable (25-35% ideal)
- Las recetas cargadas por Excel se pueden editar después desde esta misma pantalla, sin distinción técnica entre "receta importada" y "receta manual"

---

## 5. Modelo de datos (tablas principales)

- **INSUMOS**: nombre, magnitud, tipo_uso (directo/indirecto), costo_por_unidad_base
- **RECETAS**: nombre, precio_venta, tasa_iva, origen (excel/manual)
- **RECETA_INSUMOS**: receta_id, insumo_id, cantidad_usada (siempre en unidad base)
- **CONSUMO_INDIRECTO**: insumo_id, periodo (mensual), monto_gastado
- **VENTAS**: receta_id, cantidad_vendida, fecha, medio_pago (efectivo/banco), total_venta, costo_insumos_snapshot
- **GASTOS_FIJOS**: concepto, monto_mensual, categoria, medio_pago, tratamiento_fiscal
- **CONFIGURACION_NEGOCIO**: nombre_negocio, eslogan, logo_url, color_primario, color_secundario

**Periodo estándar**: mensual, para todos los acumulados (consumo indirecto, gastos fijos, Estado de Resultados).

**Nota importante**: `VENTAS.costo_insumos_snapshot` congela el costo de insumos al momento de la venta, para que cambios futuros en precios no alteren el histórico.

---

## 6. Indicadores financieros

| Indicador | Fórmula |
|---|---|
| Food cost % | (Costo de insumos del platillo / Precio de venta) × 100 |
| Margen de contribución | Precio de venta − Costo variable (insumos) |
| Punto de equilibrio | Gastos fijos totales / Margen de contribución promedio |
| Rentabilidad neta % | (Ventas − Costos variables − Gastos fijos) / Ventas × 100 |
| Ticket promedio | Ventas totales del periodo / Número de transacciones |
| Análisis ABC de platillos | Cruce de popularidad (unidades vendidas) vs. margen de contribución → 4 categorías: estrellas, caballos de batalla, enigmas, perros |

---

## 7. Estado de Resultados

Se genera un Estado de Resultados formal (mensual), con la finalidad de que pueda presentarse ante una entidad de financiamiento:

```
Ingresos por ventas
(-) Costo de ventas (insumos directos + consumo de insumos indirectos)
= Utilidad bruta
(-) Gastos de operación (gastos fijos)
= Utilidad de operación / neta
```

Cifras mostradas **antes de ISR** (ver sección de limitaciones).

---

## 8. Trazabilidad efectivo/banco

Cada venta y gasto se etiqueta con `medio_pago` (efectivo/banco). El dashboard muestra el % de movimientos por banco y despliega una recomendación contextual motivando al negocio a aumentar su trazabilidad bancaria (mejora el acceso a financiamiento futuro).

---

## 9. Impuestos (IVA)

Cada receta y gasto fijo se etiqueta con su tratamiento fiscal:

| Etiqueta | Aplica a |
|---|---|
| IVA 16% | Tasa general (mayoría de platillos, renta, luz) |
| IVA 0% | Tasa cero |
| Exento | Operaciones exentas |
| No objeto de impuesto | No es un acto gravado (ej. nómina) |

El cálculo básico de IVA (trasladado) sí se incluye en el MVP. El cálculo de ISR bajo RESICO queda excluido (ver limitaciones).

---

## 10. Carga masiva de datos (Excel)

Archivo con 5 hojas: **Insumos, Recetas, Receta_Insumos, Ventas, Gastos_Fijos** — las referencias se resuelven por nombre (no por ID). Debe importarse en ese orden. Se prepara una plantilla con datos dummy, validada con anticipación para el pitch.

**Datos demo + reset**: la app carga datos de ejemplo automáticamente y permite reiniciarlos con un botón, tanto para pruebas del equipo como para garantizar un estado limpio antes del pitch. **El dataset demo debe estar curado para mostrar un negocio rentable** (utilidad neta positiva, food cost % saludable, buen mix de platillos "estrella").

---

## 11. Accesibilidad y experiencia de usuario

- **Notas explicativas (ícono de ayuda)** junto a cada término técnico (food cost %, IVA, punto de equilibrio, etc.), con lenguaje llano — pensado para usuarios sin conocimientos contables
- **Sección de glosario/educativa** con toda la terminología del sistema, reutilizando el mismo contenido de las notas explicativas
- **Checklist de primeros pasos** en el dashboard (configurar negocio → dar de alta insumo → crear receta → registrar venta → revisar indicadores) para guiar al usuario nuevo sin interrumpir con tutoriales emergentes
- **Diseño responsivo**, pensado para uso desde celular
- **Configuración de marca**: nombre del negocio, eslogan, logo y paleta de colores, todo editable

---

## 12. Alcance excluido del MVP (roadmap público, visible en la app)

| Tema | Nota mostrada al usuario |
|---|---|
| ISR (RESICO) | Cifras mostradas antes de ISR; roadmap futuro |
| Merma / desperdicio | Food cost mostrado es teórico, no contempla desperdicio real |
| Multi-negocio | Esta versión opera para un solo negocio; arquitectura preparada para extenderse |
| Roles de usuario | Un solo usuario (el dueño) captura toda la información |
| Conversión entre magnitudes | No se convierte automáticamente masa ↔ volumen |

---

## 13. Stack tecnológico

| Componente | Tecnología | Hosting |
|---|---|---|
| Backend | Python + FastAPI | Render (plan gratuito) |
| Frontend | Next.js + Tailwind CSS | Render |
| Base de datos | PostgreSQL | Render (incluido, 1 GB gratis) |

**Nota operativa**: el servicio gratuito de Render se suspende tras 15 min de inactividad (cold start de 30-60 seg al despertar) — conviene "despertar" la app unos minutos antes del pitch.

---

*Documento generado como resumen del análisis previo al desarrollo. Última actualización: sesión de análisis del hackathon.*
