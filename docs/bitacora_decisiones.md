# Bitácora de decisiones — App de gestión financiera para restaurantes

Registro de decisiones de diseño y arquitectura tomadas durante el desarrollo del proyecto. Cada entrada nueva se agrega al final, con fecha, decisión y motivo.

---

## 2026-09-08 — Sesión de análisis inicial (con Claude, claude.ai)

**Alcance general**
Decisión: app de gestión financiera para un restaurante pequeño (menú variado), enfocada en costeo de recetas e indicadores de rentabilidad.
Por qué: mostrar al dueño la salud financiera real de su negocio de forma sencilla pero con indicadores serios de finanzas.

**Modelo de unidades de medida**
Decisión: 3 magnitudes (masa, volumen, pieza), unidad base gramos/mililitros/pieza. Solo unidades métricas de México, sin conversión entre magnitudes distintas.
Por qué: evitar necesitar datos de densidad por ingrediente; suficiente precisión sin complejidad innecesaria.

**Insumos directos vs. indirectos**
Decisión: los insumos de uso general (cebolla y cilantro de mesa, salsas picantes de mesa, servilletas, gas) se manejan como consumo periódico agregado, no ligado a receta. Nunca tienen receta propia (sin desglose de ingredientes).
Por qué: evitar recetas anidadas (un insumo hecho de otros insumos) y no fingir precisión que no es medible en la realidad.

**Interfaz de recetas**
Decisión: el usuario nunca elige unidad manualmente (se infiere del insumo seleccionado); costo y food cost % se recalculan en tiempo real.
Por qué: requisito de máxima prioridad del usuario — la interfaz debe ser extremadamente fácil.

**Carga de datos (Excel) y datos demo**
Decisión: importador de Excel con 5 hojas (Insumos, Recetas, Receta_Insumos, Ventas, Gastos_Fijos) pasa de "stretch goal" a núcleo del MVP, junto con datos demo precargados y función de reset.
Por qué: en el pitch no se va a capturar información manualmente en vivo.

**Estado de Resultados y snapshot de costos**
Decisión: se genera un Estado de Resultados formal (mensual); `VENTAS` guarda un snapshot del costo de insumos al momento de la venta.
Por qué: el usuario quiere poder presentar el documento ante una entidad de financiamiento; los cambios de precio a futuro no deben alterar el histórico.

**Trazabilidad efectivo/banco**
Decisión: cada venta y gasto se etiqueta con medio de pago (efectivo/banco); el dashboard muestra % de trazabilidad bancaria con recomendaciones contextuales.
Por qué: motivar al negocio a mejorar su historial bancario de cara a futuro financiamiento.

**Impuestos (IVA)**
Decisión: se etiqueta cada receta y gasto fijo con su tratamiento fiscal (IVA 16%, IVA 0%, exento, no objeto de impuesto). El cálculo de ISR bajo RESICO queda excluido del MVP.
Por qué: el cálculo de IVA es matemática simple y viable; el de ISR bajo RESICO requiere tablas de tasas escalonadas que se actualizan anualmente, fuera de alcance razonable.

**Multi-negocio y roles**
Decisión: se omite multi-tenancy y roles de usuario; la app opera para un solo negocio y un solo usuario (el dueño).
Por qué: no aporta valor visible al pitch y consume tiempo de desarrollo que no tienen.

**Accesibilidad y experiencia de usuario**
Decisión: notas explicativas (ícono de ayuda) junto a términos técnicos, sección de glosario, checklist de primeros pasos en el dashboard, diseño responsivo, configuración de marca (nombre, logo, colores).
Por qué: hacer la app usable por alguien sin conocimientos contables ni técnicos, y que se sienta guiado desde el primer uso.

**Roadmap de limitaciones del MVP**
Decisión: se documenta explícitamente dentro de la app qué queda fuera (ISR/RESICO, merma, multi-negocio, roles, conversión entre magnitudes), como una sección visible y actualizable.
Por qué: transparencia con el usuario y evidencia de criterio de producto ante el jurado.

**Stack tecnológico**
Decisión: backend en Python + FastAPI, frontend en Next.js + Tailwind CSS, base de datos PostgreSQL, todo hospedado gratis en Render.
Por qué: equipo sin experiencia técnica avanzada, presupuesto cero, necesidad de interfaz visualmente atractiva (se descartó Streamlit por su techo visual bajo).

---

## 2026-09-08 — Retoma de trabajo y estructura inicial del proyecto (con Claude Code)

**Raíz de trabajo**
Decisión: `proyecto/` es la raíz del proyecto (backend/, frontend/, docs/, CLAUDE.md, README.md). La carpeta `PRELIMINARES/` fuera de `proyecto/` es contexto heredado de la sesión de análisis previa (chat en claude.ai) y no forma parte del código del proyecto.
Por qué: separar el análisis/planeación (ya cerrado) del código en desarrollo.

**Nombre del negocio/app aún sin definir**
Decisión: no se fija un nombre de proyecto/marca en esta etapa. Esto es intencional, no un pendiente: nombre del negocio, eslogan, logo y paleta de colores viven en `CONFIGURACION_NEGOCIO` y deben ser editables desde la app en cualquier momento.
Por qué: instrucción explícita del usuario — la marca es un dato de configuración en runtime, no una decisión de arquitectura.

**Base de datos en desarrollo local: SQLite**
Decisión: el backend usa SQLite (`DATABASE_URL=sqlite:///./dev.db`) como default en desarrollo local; PostgreSQL se mantiene como base de datos de producción en Render (sin cambios respecto a la decisión previa).
Por qué: el equipo no tiene experiencia técnica avanzada — evita que cada quien tenga que instalar y configurar Postgres localmente solo para levantar el esqueleto. La app lee `DATABASE_URL` desde variables de entorno, así que el cambio a Postgres en Render es solo de configuración, no de código.

**Estructura del backend (FastAPI)**
Decisión: `backend/app/` con submódulos `routers/`, `models/`, `schemas/` (vacíos por ahora), más `config.py` (settings vía `pydantic-settings`) y `database.py` (engine/sesión SQLAlchemy). Sin lógica de negocio todavía.
Por qué: dejar un punto de extensión claro para cuando se agreguen los modelos de datos (Insumos, Recetas, Ventas, etc.) sin tener que reestructurar.

**Estructura del frontend (Next.js)**
Decisión: Next.js con App Router, TypeScript y Tailwind CSS, generado con `create-next-app` (plantilla `app-tw`).
Por qué: es el stack ya decidido; usar el generador oficial evita configuración manual de Tailwind/PostCSS y da un punto de partida verificado.

**Repositorio git único**
Decisión: un solo repositorio git en la raíz de `proyecto/` (no uno separado dentro de `frontend/`, que es lo que crea `create-next-app` por default).
Por qué: backend y frontend se versionan juntos como un solo proyecto de hackathon; un repo anidado complicaría el control de versiones sin aportar valor.

---

## 2026-09-08 — Modelos de datos y API CRUD base (con Claude Code)

**Las 7 tablas del análisis, tal cual**
Decisión: se implementaron en SQLAlchemy exactamente las tablas de la sección 5 del análisis: `configuracion_negocio`, `insumos`, `recetas`, `receta_insumos`, `consumo_indirecto`, `ventas`, `gastos_fijos`. Enums de Python (`Magnitud`, `TipoUsoInsumo`, `TasaIva`, `OrigenReceta`, `MedioPago`) para los campos de catálogo cerrado.
Por qué: no se reabre el modelo de datos ya decidido; solo se traduce a código.

**Enums como VARCHAR (`native_enum=False`), no ENUM nativo de Postgres**
Decisión: los campos tipo catálogo (magnitud, tipo_uso, tasa_iva, etc.) se guardan como texto con validación en la app, no como tipo ENUM nativo de PostgreSQL.
Por qué: un ENUM nativo de Postgres es más difícil de alterar después (requiere migraciones especiales) y no existe en SQLite, que se usa en desarrollo local; texto plano funciona igual en ambos motores sin fricción.

**`ConfiguracionNegocio` como tabla singleton (id=1 fijo)**
Decisión: en vez de CRUD genérico, tiene su propio router con GET (crea el default si no existe) y PUT (upsert) sobre el registro id=1.
Por qué: solo existe una configuración de marca por negocio (un solo negocio, ya decidido); no tiene sentido una lista.

**Sin Alembic todavía — `Base.metadata.create_all()` al arrancar**
Decisión: las tablas se crean automáticamente al iniciar el backend (`main.py`), sin herramienta de migraciones.
Por qué: velocidad para el hackathon; con `create_all` alcanza mientras el esquema es nuevo. Si más adelante se necesita alterar tablas con datos ya cargados, se evaluará agregar Alembic.

**CRUD genérico (`app/routers/_crud.py`)**
Decisión: un factory `build_crud_router()` genera list/create/get/update/delete para las 6 entidades con forma repetida (todas menos `configuracion_negocio`), en vez de escribir 6 routers casi idénticos a mano.
Por qué: la repetición real entre 6 entidades justifica la abstracción (no es un caso hipotético); mantiene cada router de entidad en ~10 líneas declarativas.

**Sin lógica de negocio en esta etapa**
Nota: estos endpoints son solo persistencia (CRUD). Food cost %, margen de contribución, punto de equilibrio, Estado de Resultados, etc. van en una capa aparte más adelante — no se calculan todavía.

---

## 2026-09-08 — Primera pantalla real: alta de Insumos (con Claude Code)

**Calculadora de costo para insumos directos, solo en el frontend**
Decisión: en el formulario de alta de insumo, cuando `tipo_uso = directo`, el usuario captura unidad de compra + precio de compra + cantidad comprada, y el frontend calcula `costo_por_unidad_base` (precio ÷ cantidad en unidad base) antes de enviarlo a la API. El backend sigue recibiendo y guardando solo el resultado final (`costo_por_unidad_base`), sin nuevos campos.
Por qué: el análisis (sección 3) especifica que el costo de insumos directos "se calcula automáticamente (precio de compra ÷ cantidad)", pero el modelo de datos ya decidido (sección 5) solo contempla `costo_por_unidad_base` como campo persistido — no se reabre el esquema, se resuelve el cálculo antes de guardar.
Para insumos indirectos, se mantiene el campo manual directo (costo de referencia capturado a mano), sin calculadora.

**Bug de tema oscuro automático — resuelto**
Se encontró que `app/globals.css` (generado por `create-next-app`) fijaba `body { background: var(--background) }` fuera de cualquier `@layer`, lo que le daba prioridad de cascada por encima de las clases de Tailwind (`bg-zinc-50`) sin importar el orden. Se eliminaron esas reglas de `globals.css`; el color de fondo/texto ahora se controla solo con clases de Tailwind en `layout.tsx`.
Por qué: causaba que la app se viera con fondo negro en navegadores/SO con tema oscuro, contradiciendo el diseño (aún genérico, pendiente de theming real vía `ConfiguracionNegocio`).

**Navegación mínima**
Decisión: `layout.tsx` incluye un header simple con el nombre del negocio (aún hardcodeado como "Mi restaurante", pendiente de conectarse a `ConfiguracionNegocio`) y un solo link a "Insumos", en vez de construir toda la navegación de antemano.
Por qué: evitar links a pantallas que no existen todavía; se va agregando un link por cada pantalla real que se construya.

---

## 2026-09-08 — Pantalla de Recetas: alta, edición y food cost % en vivo (con Claude Code)

**Una sola pantalla para crear y editar (ruta dinámica `/recetas/[id]`)**
Decisión: `/recetas/nueva` y `/recetas/123` usan el mismo componente (Next.js resuelve `nueva` como el parámetro `id` al no existir una ruta estática que compita). El modo se decide en runtime comparando `id === "nueva"`.
Por qué: la regla ya decidida dice "las recetas se editan igual desde la misma pantalla, sin importar su origen" — se implementa literalmente con una sola pantalla en vez de dos que puedan divergir con el tiempo.

**Insumos de una receta: persistencia inmediata en edición, diferida en creación**
Decisión: si la receta ya existe (`recetaId` no nulo), agregar/quitar un insumo llama al API de inmediato (`POST`/`DELETE /receta-insumos`). Si la receta es nueva (aún no tiene id), las filas se mantienen solo en memoria y se guardan en lote justo después de crear la receta al enviar el formulario.
Por qué: no se puede crear un `receta_insumo` sin un `receta_id` real; en edición, guardar de inmediato evita un flujo de "guardar cambios de insumos" aparte y es consistente con que el food cost % ya se ve en vivo.

**Semáforo de food cost %: rangos definidos (verde 25-35%, amarillo 15-45%, rojo fuera de eso)**
Decisión: se fijaron umbrales concretos para el semáforo verde/amarillo/rojo mencionado en el análisis (sección 4), ya que ahí solo se menciona el rango ideal (25-35%) sin definir los límites de amarillo/rojo.
Por qué: es una decisión de producto razonable y documentada que puede ajustarse después con feedback real; no bloquea el avance por falta de un número exacto en el análisis original.

**Cálculo de food cost en el frontend, sin endpoint dedicado en el backend**
Decisión: el costo de una receta se calcula en el frontend combinando `/insumos` + `/receta-insumos` (traídos completos y filtrados en el cliente), no con un endpoint de "costo total" en el backend.
Por qué: el volumen de datos de un restaurante pequeño es bajo; evita construir lógica de agregación en el backend antes de tener claro qué otras pantallas (Estado de Resultados, ABC) también la van a necesitar.

**Verificado en navegador**: alta de receta con insumo directo (carne de res 150g → $27.00, food cost 22.5%, badge amarillo), edición agregando un segundo insumo (pan 1 pza → total $31.50, food cost 26.3%, badge verde) y eliminación de un insumo de la receta — los tres flujos persisten correctamente en la base de datos.

---

## 2026-09-08 — Pantalla de Ventas: registro con snapshot de costos (con Claude Code)

**`total_venta` y `costo_insumos_snapshot` se calculan y se congelan al momento de guardar, nunca se capturan a mano**
Decisión: el formulario de ventas no pide estos dos campos como texto libre; se calculan en el frontend (precio de la receta × cantidad; costo actual de la receta × cantidad) y se envían ya resueltos al crear la venta. Una vez guardados, quedan fijos en la base de datos.
Por qué: es la regla ya decidida de más alto valor para el pitch (financiamiento) — el histórico de ventas no debe moverse si después cambia el precio de un insumo.
**Verificado en navegador**: se registró una venta (3 hamburguesas, margen $279.00), luego se subió el precio del insumo "Carne de res" de $0.18 a $0.50 por gramo. La venta ya registrada siguió mostrando margen $279.00 sin cambios; una venta nueva, en cambio, ya calcula con el precio actualizado ($75.00 de costo por unidad en vez de $27.00). Confirma que el snapshot funciona como se diseñó.

**Ventas no son editables, solo eliminables**
Decisión: a diferencia de Insumos/Recetas, la pantalla de Ventas no tiene "editar", solo crear y eliminar.
Por qué: una venta es un hecho histórico; no tiene sentido de negocio "editarla" (equivaldría a falsificar el registro). Si se capturó mal, se elimina y se vuelve a registrar.

**Resumen de trazabilidad efectivo/banco embebido en la misma pantalla**
Decisión: se agregó una barra con el total de ventas del mes y el % pagado por banco, calculada en el cliente a partir de las ventas ya cargadas, en vez de esperar a construir el dashboard general.
Por qué: el análisis (sección 8) ya pide este dato específicamente junto a las ventas; es información barata de calcular con los datos que la pantalla ya tiene cargados.

---

## 2026-09-08 — Gastos Fijos y Configuración del negocio (con Claude Code, sesión autónoma)

El usuario pidió avanzar por todos los módulos restantes sin pausar a pedir aprobación en cada uno; esta entrada agrupa varias decisiones tomadas en esa sesión continua.

**Gastos Fijos: mismo patrón que Insumos (crear + listar + eliminar, sin editar)**
Decisión: `/gastos-fijos` sigue el patrón ya establecido (no el de Recetas/Ventas). Se agregó un total mensual al pie de la tabla.
Por qué: consistencia con el resto de catálogos simples; el total mensual es insumo directo para el punto de equilibrio y el Estado de Resultados que siguen en el roadmap.

**Categoría de gasto fijo: texto libre con sugerencias, no catálogo cerrado**
Decisión: el campo `categoria` es un input de texto con `datalist` (Renta, Nomina, Luz, Agua, Internet, Gas, Mantenimiento) en vez de un select fijo.
Por qué: el análisis no define categorías cerradas; texto libre evita bloquear al usuario si su gasto no encaja en una lista corta, sin perder la comodidad de autocompletado.

**Marca configurable: nombre y color de marca sí se propagan a toda la app; logo y color secundario, capturados pero sin theming completo todavía**
Decisión: se implementó `/configuracion` (edita nombre, eslogan, logo, color primario, color secundario contra el endpoint singleton ya existente). El nombre del negocio y el color primario se aplican de verdad en toda la app: un componente `BrandHeader` (en el layout) lee la configuración una vez por sesión, escribe el nombre en el header y fija `--brand-primary`/`--brand-secondary` como variables CSS en `:root`; todos los botones "primarios" de la app usan una clase `.btn-primary` que consume `var(--brand-primary)` en vez de un color fijo de Tailwind.
El logo (`logo_url`) y el color secundario se guardan y se pueden editar, pero todavía no se usan visualmente en ningún lado (no hay `<img>` del logo en el header, ni ningún elemento usa `--brand-secondary` aun).
Por qué: el usuario pidió explícitamente, antes de escribir código, que nombre/logo/paleta fueran configurables "en cualquier momento". Se prioriza que el cambio más visible (nombre + color de acción principal) funcione de verdad en todos lados; el logo y el color secundario quedan como siguiente iteración de theming, no bloquean el resto del MVP.
Después de guardar cambios en `/configuracion`, la pantalla fuerza un `window.location.reload()` para que el nuevo nombre/color se vea de inmediato en el header (que solo se carga una vez por sesión de navegación).
**Verificado en navegador**: se cambió el nombre a "Tacos El Buen Sazon" y el color primario ya venia en `#DC2626` desde los defaults del modelo — tras guardar, el header mostró el nuevo nombre y el botón "Guardar insumo" en la pantalla de Insumos (pantalla no relacionada) ya se pintaba con ese mismo color, confirmando que el theming es real y no solo cosmético en la pantalla de configuración.

---

## 2026-09-08 — Consumo indirecto, Dashboard de indicadores, Estado de Resultados, ABC, Glosario y Alcance del MVP (con Claude Code, sesión autónoma)

**Pantalla de Consumo indirecto agregada antes que el Estado de Resultados**
Decisión: se construyó `/consumo-indirecto` (solo insumos marcados como "indirecto", captura mensual de gasto) antes de tocar el Estado de Resultados, porque este último necesita esa fuente de datos para el renglón "costo de ventas" (insumos directos + consumo de insumos indirectos, tal como pide la sección 7 del análisis).

**El Dashboard ("/") reemplaza la pantalla de bienvenida generica**
Decisión: la página de inicio ahora es el dashboard real: checklist de primeros pasos (con estado dinámico segun haya o no insumos/recetas/ventas/gastos/configuración) + tarjetas de indicadores del mes actual (ventas, food cost %, margen de contribución, punto de equilibrio, rentabilidad neta, ticket promedio, % de ventas por banco).
Por qué: la sección 11 del análisis pide el checklist específicamente "en el dashboard"; no tenía sentido dejarlo en una pantalla de bienvenida separada del resumen financiero.

**Punto de equilibrio: umbral de "margen de contribución promedio invalido" devuelve N/D en vez de un número absurdo**
Decisión: si el margen de contribución promedio por unidad es cero o negativo (posible si los insumos cuestan mas que el precio de venta), el punto de equilibrio se muestra como "N/D" en vez de dividir entre cero o mostrar un negativo sin sentido.
Por qué: evita un numero engañoso en el dashboard cuando los datos capturados todavia no tienen sentido de negocio (p. ej. demo/pruebas incompletas).

**Estado de Resultados: selector de mes, no solo el mes actual**
Decisión: la pantalla permite elegir cualquier mes (`input type="month"`) para recalcular el Estado de Resultados completo, en vez de mostrar solo el mes en curso.
Por qué: para el pitch puede ser util mostrar un mes ya cerrado con datos demo curados, no necesariamente el mes calendario real en que se hace la demo.

**IVA trasladado: se muestra como dato informativo, fuera de la utilidad**
Decisión: se calcula el IVA trasladado del mes (16% incluido en el precio de las recetas con esa tasa) y se muestra debajo del Estado de Resultados, sin restarlo de la utilidad.
Por qué: la sección 9 del análisis solo pide que "el cálculo básico de IVA (trasladado) se incluya en el MVP", sin especificar que se integre a la utilidad; mostrarlo aparte evita mezclar impuestos trasladados (que no son ingreso ni gasto real del negocio) con el resultado del periodo.

**ABC de platillos: usa el costo ACTUAL de la receta, no el snapshot historico de las ventas**
Decisión: el margen por platillo para la clasificación ABC se calcula con `calcularCostoReceta` (precio actual de los insumos), mientras que Ventas y Estado de Resultados usan `costo_insumos_snapshot` (el costo congelado al momento de cada venta).
Por qué: ABC es una herramienta para decidir que hacer con el menu HOY (subir precio, promover, quitar un platillo) — tiene que reflejar el costo actual, no uno historico. El Estado de Resultados, en cambio, es un reporte contable del pasado y por eso sí usa el snapshot. Son dos preguntas distintas que requieren dos costos distintos, ambos legítimos.

**ABC: clasificación por mediana de popularidad y margen entre los platillos con ventas, con umbral mínimo de 2 platillos**
Decisión: se necesitan al menos 2 platillos con ventas para calcular medianas y clasificar; con menos, se muestra un mensaje pidiendo mas datos en vez de forzar una clasificación sin sentido estadístico.

**Glosario y Alcance del MVP como paginas estaticas de contenido**
Decisión: `/glosario` y `/alcance` son paginas de solo lectura con el contenido ya definido en el análisis (secciones 11 y 12), sin conexión a la base de datos.
Por qué: son requisitos de UX/transparencia explícitos en el análisis y en CLAUDE.md ("Alcance y limitaciones del MVP" debe ser una pantalla visible); no dependen de datos del usuario, así que no había razón para complicarlos con fetch al backend.

**Verificado en navegador con datos sembrados (2 recetas, 2 ventas, gastos fijos, consumo indirecto)**: dashboard, Estado de Resultados y ABC mostraron cifras que coinciden exactamente con el cálculo manual esperado (ventas $3200, food cost 28.8%, punto de equilibrio 253 platillos/mes, utilidad neta -$21,022.50, IVA trasladado $441.38, "Hamburguesa clásica" clasificada como caballo de batalla y "Hamburguesa doble" como enigma).

---

## 2026-09-08 — Datos demo curados, auto-carga y botón de reset (con Claude Code, sesión autónoma)

**Generador de datos demo en código (`app/seed_data.py`), no un dump de SQL ni un Excel**
Decisión: el dataset demo (13 insumos, 8 recetas con sus ingredientes, 6 gastos fijos, 3 consumos indirectos, 37 ventas repartidas en el mes actual) se define como estructuras de datos en Python, y el costo de cada receta se calcula en el momento a partir de sus ingredientes (no se escribió a mano).
Por qué: escribir a mano decenas de valores de costo/margen para que el resultado final se viera "rentable con food cost sano" es propenso a error aritmético; calcularlo en código garantiza que los números mostrados en el dashboard sean consistentes con las recetas reales.

**El dataset demo se carga solo si la base esta vacia; el boton de reset lo fuerza en cualquier momento**
Decisión: al arrancar, `main.py` revisa si existe al menos un insumo; si la base esta vacia (primer arranque, o `dev.db` borrado), corre el seed automaticamente. Ademas, `POST /admin/reset-demo` borra TODO (insumos, recetas, receta_insumos, consumo_indirecto, ventas, gastos_fijos) y vuelve a sembrar, incluyendo la configuracion del negocio (nombre "Sazon de Barrio", colores de marca).
Por qué: la sección 10 del análisis pide ambas cosas explícitamente ("la app carga datos de ejemplo automáticamente y permite reiniciarlos con un botón"), pensado para que el equipo pueda ensuciar los datos probando la app y dejarla lista de nuevo antes del pitch con un clic.
El botón vive en `/configuracion` bajo una "Zona de datos demo" con confirmación (`window.confirm`) antes de ejecutar, por ser una acción destructiva e irreversible.

**Números del dataset demo, verificados en navegador**: ventas del mes $78,050, food cost 26.6% (rango sano), margen de contribución $57,265.75, rentabilidad neta 34.3%, punto de equilibrio 472 platillos/mes, 67% de ventas por banco, y los 8 platillos se reparten en las 4 categorías del análisis ABC (1 estrella, 3 caballos de batalla, 3 enigmas, 1 perro) — cumple el requisito de "negocio rentable, food cost saludable, buen mix de estrellas" para el pitch.

**Bug encontrado y corregido: eliminar un insumo/receta en uso devolvía 500 en vez de un error claro**
Al probar el reset (borrando y resembrando encima de datos ya existentes) se detectó que el DELETE genérico (`app/routers/_crud.py`) fallaba con `IntegrityError` sin capturar: SQLAlchemy intenta poner en `NULL` la columna `insumo_id` de `receta_insumos` al borrar un insumo referenciado, pero esa columna es `NOT NULL`, y la excepción no se manejaba, resultando en un 500 crudo del servidor.
Corrección: el DELETE genérico ahora captura `IntegrityError`, hace rollback y responde 400 con "No se puede eliminar: esta en uso por otro registro". Afecta a Insumos, Recetas, Receta-Insumos, Consumo indirecto, Ventas y Gastos Fijos por igual, ya que todos comparten el mismo router genérico.
Por qué: un 500 sin mensaje se hubiera visto mal en vivo durante el pitch si alguien intenta borrar un insumo que ya esta usado en una receta; ahora el usuario ve una razón entendible (aunque el mensaje del frontend todavia se ve algo tecnico — "Error 400: {...}" — pendiente de pulir la presentación del error, no la logica).

---

## 2026-09-08 — Importador de Excel (con Claude Code, sesión autónoma)

**Formato de columnas propio, en español, no una plantilla externa**
Decisión: se definieron las columnas esperadas de cada una de las 5 hojas (Insumos, Recetas, Receta_Insumos, Ventas, Gastos_Fijos) directamente a partir de los campos de cada tabla, en español y con nombres de columna flexibles (ej. "Tipo de uso" o "tipo_uso" ambos funcionan). La pantalla `/importar` documenta el formato exacto esperado por hoja.
Por qué: el análisis solo especifica que existen esas 5 hojas y que las referencias son por nombre, pero no fija los encabezados de columna exactos; se diseñaron pensando en alguien sin experiencia técnica que arma el Excel a mano.

**Errores por fila, no aborto de todo el archivo**
Decisión: si una fila tiene un dato invalido o una referencia (por nombre) que no existe, esa fila se omite y se reporta con hoja + numero de fila + motivo, pero el resto del archivo se sigue procesando.
Por qué: con un archivo de decenas o cientos de filas armado a mano, es mucho mas util saber exactamente cuales 3 filas fallaron que descubrir hasta el final que todo el archivo se rechazo por un solo error de captura.

**Insumos/Recetas que ya existen (mismo nombre) se actualizan, no se duplican**
Decisión: al importar, si el nombre de un insumo o receta ya existe en la base, se actualizan sus campos en vez de crear un registro duplicado.
Por qué: permite reimportar el mismo archivo corregido sin generar duplicados, y sirve tambien como forma de actualizar precios/costos en lote.

**`total_venta` y `costo_insumos_snapshot` son columnas opcionales en la hoja Ventas: si faltan, se calculan solos**
Decisión: igual que en la pantalla de captura manual de Ventas, el importador nunca obliga a la persona que arma el Excel a calcular a mano el total de la venta o el costo de insumos — si esas columnas vienen vacías, se calculan automáticamente (precio de la receta x cantidad; costo actual de la receta x cantidad).
Por qué: consistencia con la regla de UX ya aplicada en toda la app ("nunca pedir un calculo que el sistema puede hacer solo"); tambien permite cargar ventas historicas con su costo real de ese momento si se conoce, pasandolo explicitamente en el archivo.

**openpyxl en vez de pandas**
Decisión: se usa `openpyxl` directamente para leer el `.xlsx`, sin agregar `pandas`.
Por qué: pandas trae `numpy` como dependencia pesada solo para leer celdas de un archivo; openpyxl es suficiente y mas liviano para este caso de uso puntual.

**Verificado en navegador con un archivo de prueba con errores intencionales**: se importaron correctamente 2 insumos, 2 recetas, 2 receta-insumos, 2 ventas y 1 gasto fijo, mientras se reportaron con precisión las 3 filas con errores a propósito (tipo de uso inválido, insumo inexistente, receta inexistente). Se confirmó ademas, contra la base de datos, que `total_venta` y `costo_insumos_snapshot` de las ventas importadas sin esas columnas se calcularon correctamente ($650/$139 y $325/$69.50, coincidiendo con el calculo manual esperado).

---

## 2026-09-08 — Iconos de ayuda contextual y verificacion de responsividad movil (con Claude Code, sesión autónoma)

**`HelpIcon`: componente reutilizable con tooltip, no cobertura exhaustiva en cada termino**
Decisión: se creó `components/HelpIcon.tsx` (un boton "?" que muestra un tooltip con texto en lenguaje llano) y se aplicó a los puntos de mayor valor: las 7 tarjetas de indicadores del dashboard y el campo IVA + food cost % en el constructor de recetas. No se cubrió cada termino tecnico en cada pantalla de la app.
Por qué: el análisis pide "iconos de ayuda junto a cada termino tecnico" como principio general de UX; dado el tiempo del hackathon, se priorizaron los lugares donde un dueño de restaurante sin conocimientos financieros mas los necesita (los indicadores del dashboard) en vez de cubrir exhaustivamente cada pantalla. Extender `HelpIcon` a mas lugares (Ventas, Gastos Fijos, Consumo indirecto) es sencillo y queda como pulido pendiente si hay tiempo.

**Responsividad movil verificada, no solo asumida**
Se probó el Dashboard y el constructor de Recetas en viewport movil (375x812) en el navegador: las tarjetas de indicadores caen a una columna, la navegación se ajusta en varias líneas, y los formularios se apilan correctamente sin scroll horizontal. No se encontraron problemas de layout — el uso consistente de utilidades mobile-first de Tailwind (clases base sin prefijo aplican en movil, `sm:`/`lg:` agregan columnas en pantallas grandes) ya daba responsividad razonable sin trabajo adicional.

---

## 2026-09-08 — Segunda ronda de pulido: errores legibles, logo, color secundario, mas ayuda contextual (con Claude Code, sesión autónoma)

**Mensajes de error legibles en toda la app**
Decisión: `lib/api.ts` ahora intenta parsear el `detail` de la respuesta JSON de error del backend (incluye el caso de errores de validación de FastAPI, que devuelven una lista de objetos). Antes, cualquier error no-2xx se mostraba como `Error 400: {"detail":"..."}` crudo en pantalla.
Por qué: se detectó este defecto al usar el mensaje de "no se puede eliminar, esta en uso" agregado en la ronda anterior; el mensaje era correcto pero se veia con JSON crudo, mala señal para un demo en vivo.

**Logo y color secundario, ahora sí usados visualmente**
Decisión: `BrandHeader` muestra el logo (`logo_url`) junto al nombre del negocio si esta configurado. El header completo usa `--brand-secondary` como color de un borde inferior de 4px, dandole una segunda nota de marca ademas del color primario ya usado en botones.
Por qué: quedó pendiente en la ronda anterior — se capturaban ambos campos en `/configuracion` pero no se veian en ningun lado; ahora "nombre, logo y paleta configurables en cualquier momento" se cumple por completo, no solo a medias.

**Cobertura de `HelpIcon` ampliada a Insumos, Gastos Fijos, Ventas y Consumo Indirecto**
Se agregaron iconos de ayuda en: tipo de uso de insumo (directo/indirecto), tratamiento fiscal en gastos fijos, "% en banco" y el bloque de costo congelado en Ventas, y el picker de insumo indirecto en Consumo Indirecto. Con esto, todas las pantallas de captura tienen al menos un punto de ayuda contextual, no solo el Dashboard y Recetas de la ronda anterior.

**Verificado en navegador**: logo visible en el header, borde inferior con el color secundario correcto (`rgb(31,41,55)` = `#1F2937`), mensaje de error limpio al intentar eliminar un insumo en uso ("No se puede eliminar: esta en uso..." sin JSON visible), y los tooltips de ayuda abren y muestran el texto correcto al hacer clic en las 4 pantallas nuevas.

---

## 2026-09-08 — Rediseño de navegación: sidebar, Egresos, edición de registros y selector de periodo (con Claude Code, sesión autónoma)

Sesión larga de retroalimentación de UX con el usuario (comparando contra dos demos de compañeros de equipo, AURAFI y CuentaClara) que se tradujo en cambios reales, no solo en una lista para despues.

**Menu superior reemplazado por sidebar fijo, agrupado por categoria**
Decisión: `components/Sidebar.tsx` + `components/AppShell.tsx` reemplazan el header con links en fila. Agrupacion: **Catalogos** (Insumos, Recetas) / **Operacion diaria** (Ventas) / **Egresos** (Compra de insumos, Consumo indirecto, Gastos fijos) / **Reportes** (Resumen, Estado de resultados, ABC) / **Configuracion** (Importar Excel, Glosario, Alcance, Negocio). Se uso `lucide-react` para los iconos (nueva dependencia).
Por qué: el usuario señalo que el nav superior no se sentia intuitivo comparado con otras apps de referencia que usan sidebar; la agrupacion Catalogos/Operacion diaria/Egresos/Reportes refleja como piensa el dueño del negocio ("esto es lo que tengo" vs. "esto es lo que me paso") en vez de agrupar por tipo de dato tecnico.
En movil, el sidebar se convierte en un drawer (`AppShell`) que se abre con un boton hamburguesa y se cierra solo al navegar a un link.

**Nueva pantalla "Compra de insumos" (`/egresos/compras-insumos`) con modelo propio (`CompraInsumo`)**
Decisión: se agrego una tabla `compras_insumo` (insumo_id, fecha, unidad_compra, cantidad_comprada, precio_compra, costo_por_unidad_base) y un router dedicado (no el CRUD generico) porque crear o editar una compra tiene un efecto secundario: actualiza `Insumo.costo_por_unidad_base` con el valor de esa compra. Borrar una compra NO revierte el costo del insumo a un valor anterior (no se rastrea cronologia de precios, solo se actualiza "hacia adelante").
Por qué: el usuario detecto que hoy "el empresario no tendria manera de saber cuanto insumo compro este mes" — la calculadora de compra que ya existia en el alta de Insumos nunca dejaba un registro fechado, solo el numero final. Esta pantalla es el verdadero "Egresos por insumos", simetrica a Ventas como "Ingresos".
La calculadora de compra en el alta de Insumos se mantiene (para el costo inicial al crear un insumo nuevo); las compras subsecuentes se registran aqui.

**Edicion agregada a Insumos, Ventas, Gastos Fijos, Consumo Indirecto y Compra de insumos**
Decisión: las 5 pantallas ahora tienen boton "Editar" (ademas de "Eliminar"), con el mismo patron: clic en Editar precarga el formulario de arriba, el boton cambia a "Guardar cambios" y aparece "Cancelar edicion". El backend ya soportaba `PUT` en todas (el router CRUD generico ya lo incluia desde el principio); solo faltaba la interfaz.
Caso especial en **Ventas**: si al editar no cambias la receta ni la cantidad (ej. solo corriges que pusiste "banco" en vez de "efectivo"), el `total_venta` y el `costo_insumos_snapshot` se preservan tal cual, sin recalcularse. Si cambias receta o cantidad, se recalculan con el costo actual (equivale a describir una venta distinta).
Por qué: el usuario señalo explicitamente el caso de equivocarse en el medio de pago de una venta y no tener forma de corregirlo sin borrar y recapturar. Verificado en navegador: se cambio el medio de pago de una venta de "efectivo" a "banco" y `total_venta`/`costo_insumos_snapshot` quedaron exactamente iguales ($840.00 / $144.00).
Caso especial en **Insumos**: al editar, el costo se ajusta como un numero directo (no se reconstruye la calculadora de compra original, porque esos datos de unidad/precio/cantidad nunca se guardaron para insumos existentes antes de esta sesion). Un icono de ayuda aclara que para una compra nueva con fecha se debe usar Egresos > Compra de insumos.

**Selector de periodo unificado (Este mes / Mes pasado / Año actual / Todo el historial)**
Decisión: `lib/periodo.ts` (`PeriodoTipo`, `fechaEnPeriodo`, `mesesEnPeriodo`) + `components/PeriodSelector.tsx`, usado en Dashboard y Estado de Resultados. ABC muestra una etiqueta fija de "Todo el historial" (sin selector) porque es intencionalmente un analisis de largo plazo, no un corte por periodo.
Por qué: el usuario señalo que no era obvio que periodo se estaba viendo en el dashboard (quedaba fijo al mes actual, sin decirlo con claridad) y pidio poder ver por año. Se opto por opciones predefinidas en vez de un rango de fechas libre por ser mas simple de construir y cubrir el caso de uso real de un MVP.

**Gastos fijos escalados por numero de meses del periodo seleccionado**
Decisión: como `monto_mensual` es un valor MENSUAL, al ver "Año actual" se multiplica por los meses transcurridos del año (ej. 9 en septiembre); al ver "Todo el historial" se multiplica por la cantidad de meses distintos con ventas registradas. Se muestra una nota explicando el multiplicador cuando aplica.
Por qué: sin este ajuste, seleccionar "Año actual" mostraria una rentabilidad absurdamente alta (ventas de varios meses contra gastos fijos de uno solo) — era un bug real que el propio selector de periodo hubiera introducido si no se corregia.

**Tarjetas de tendencia ("X% vs. periodo anterior") solo en Ventas, Margen de contribucion y Rentabilidad neta, y solo para Este mes / Mes pasado**
Decisión: no se muestra tendencia en Food cost %, Punto de equilibrio, Ticket promedio ni % banco (la semantica de "subir es bueno" no aplica igual en todos, ej. food cost subiendo es malo); tampoco se muestra en "Año actual" ni "Todo el historial" porque comparar un año parcial contra uno completo (o "todo" contra nada) no seria una comparacion justa.
Por qué: mostrar una tendencia con semantica de color incorrecta (verde cuando en realidad empeoro) seria peor que no mostrar nada; se prefirio ser conservador y solo mostrarla donde el calculo y su interpretacion son inequivocos.

**Transparencia sobre costeo de inventario agregada a Alcance del MVP**
Se agrego una limitacion explicita: "el costo de un insumo es un precio de referencia vigente, no un promedio ponderado de existencias; la app no rastrea cuanto queda en existencia de un insumo comprado a un precio anterior." Es la misma idea ya explicada al usuario en el chat, ahora tambien documentada donde el jurado del hackathon puede verla.

**Verificado en navegador (batch completo)**: sidebar con agrupacion e icono activo correcto; drawer movil se abre y se cierra solo al navegar; Compra de insumos crea y edita, actualizando `Insumo.costo_por_unidad_base` en vivo (verificado contra la API: $0.16 -> $0.185 -> $0.19); edicion confirmada en las 5 pantallas; selector de periodo probado en "Este mes", "Año actual" (multiplicador de 9 meses correcto) y "Todo el historial"; tendencia vs. periodo anterior calculada correctamente tras sembrar una venta de prueba en el mes pasado; las 14 rutas responden 200 y no hay errores de React/hidratacion en consola.

---

## 2026-09-08 — Separador de miles, terminologia en español, e IVA corregido en datos demo (con Claude Code)

**Separador de miles: `lib/format.ts` (`formatMoney`), usado en todos los montos de dinero de la app**
Decisión: se creó un helper `formatMoney(value, decimals=2)` que usa `toLocaleString("es-MX", ...)` y se reemplazaron los ~30 sitios que armaban el string a mano (`` `$${valor.toFixed(2)}` ``) por este helper, en Dashboard, Recetas, Ventas, Gastos Fijos, Consumo Indirecto, Compra de insumos, Estado de Resultados, ABC e Insumos.
Por qué: el usuario señaló que en México los miles se separan con coma ($78,050.00), y el formato anterior los mostraba pegados ($78050.00). Los porcentajes (`.toFixed(1)%`, `.toFixed(0)%`) se dejaron intactos a propósito — no son moneda y no llevan separador de miles.

**"Food cost %" renombrado a "Costo de alimentos %" en toda la interfaz**
Decisión: se tradujo el termino visible en Dashboard, Recetas (lista y constructor), Glosario, Alcance del MVP y Configuración (zona de datos demo). El nombre interno del componente (`FoodCostBadge`, prop `foodCostPct`) y la función `foodCostSemaforo` no se tocaron, por ser codigo interno sin impacto en lo que ve el usuario.
Por qué: pedido explicito del usuario — la app es en español, un termino en ingles se sentia fuera de lugar. Se eligio "costo de alimentos" (no "costo de insumos", que ya se usa para el monto en pesos de una receta) para evitar ambiguedad entre las dos etiquetas.

**Bug de datos demo corregido: recetas ya no usan IVA 0%**
Decisión: "Ensalada de pollo" y "Ensalada verde" pasaron de `iva_0` a `iva_16` en `seed_data.py`. Ahora las 8 recetas del dataset demo usan IVA 16%.
Por qué: el usuario detecto correctamente que no hay una razón real para que un platillo preparado en un restaurante tenga tasa 0% de IVA — esa tasa aplica a alimentos basicos sin preparar (ej. fruta y verdura sin procesar), no a comida de restaurante. Fue un error propio: se habia asignado esa tasa solo "para variedad" en el dataset demo, sin justificación real. La variedad de tasas fiscales sigue existiendo en Gastos Fijos (renta iva_16, nomina no_objeto, agua exento), donde sí es correcta.

**Verificado en navegador**: Dashboard, Recetas y Estado de Resultados muestran montos con coma de miles ($78,050.00, $57,265.75, $-21,934.25 incluyendo negativos); las 8 recetas del dataset demo muestran "IVA 16%"; no quedan restos de "food cost" en ningun texto visible de la app (`grep` sin resultados).

---

## 2026-09-08 — Historial demo de 21 meses, ticket promedio realista y primeras graficas (con Claude Code, sesión autónoma)

Tres cambios acordados en una sesión larga de analisis con el usuario (discutiendo flujo de efectivo, la pregunta "cuanto realmente gano", el snapshot de costos y referencias visuales de apps de compañeros de equipo).

**Nota de "Flujo de efectivo" agregada a Alcance del MVP**
Se declaro explicitamente que la app contesta "¿es rentable mi negocio?" (Estado de Resultados, costo de lo vendido) pero no "¿cuanto dinero tengo en banco o efectivo ahorita?" (liquidez). Se decidio NO construir un reporte de flujo de efectivo completo en este MVP — hubiera requerido reabrir el modelo de Consumo Indirecto (agregarle `medio_pago`, que el analisis original no incluyo) y una pantalla nueva; se opto por declararlo como limitacion consciente, igual que merma o costeo de inventario.

**Historial demo extendido a 21 meses (enero 2025 - mes actual), con curva de crecimiento**
Decisión: `seed_data.py` ahora genera ventas, consumo indirecto y compras de insumo para CADA mes desde enero 2025 hasta el mes en curso (calculado dinámicamente con `_meses_desde`, no una fecha fija), escalando los volumenes con un factor de crecimiento lineal (50% en el primer mes -> 100% en el mas reciente) en vez de repetir el mismo mes copiado 21 veces.
Por qué: el usuario pidio poder mostrar un Estado de Resultados de un año COMPLETO Y CERRADO para el pitch (no el año en curso, parcial). Esto requirio agregar un tipo de periodo nuevo:

**Nuevo tipo de periodo "Año pasado" (`anio_pasado`)**
`lib/periodo.ts` ahora distingue "Año actual" (parcial, enero-mes en curso, ya existia) de "Año pasado" (los 12 meses completos del año calendario anterior, nuevo). `mesesEnPeriodo` para "año pasado" siempre multiplica los gastos fijos por 12 (a diferencia de "año actual" que usa los meses transcurridos).

**Ticket promedio corregido: era un artefacto de como se generaban los datos demo, no un problema del indicador**
Diagnóstico: cada "venta" en la base de datos es una transaccion real; pero el generador original agrupaba decenas de unidades en muy pocas filas (ej. "35 hamburguesas" en un solo registro) para no escribir cientos de tuplas a mano, lo que inflaba artificialmente `ventas totales / numero de transacciones` a mas de $2,000 por ticket. Se corrigió generando lotes pequeños y realistas (1-5 unidades por transaccion, usando `random.Random` con semilla fija para reproducibilidad) — el ticket promedio bajo a ~$256, dentro del rango $250-300 que el usuario identifico como realista para una tiendita de comida pequeña. Efecto secundario: subio el numero total de filas de ventas (de 37 a ~4,700 en 21 meses); se agrego un limite de 150 filas visibles en la tabla de `/ventas` (con nota de cuantas hay en total) para que la pagina no intente renderizar miles de `<tr>`.
Por qué: el usuario señalo correctamente que $2,000+ de ticket promedio es ilogico para un negocio de comida micro/pequeño; la causa raiz no era el calculo (`Ventas totales / Numero de transacciones`, que es correcto) sino la granularidad artificial de los datos de prueba.

**Primeras graficas: Recharts + un componente SVG propio para el gauge**
Se instaló `recharts` y, siguiendo la skill de dataviz del proyecto (paleta validada con `scripts/validate_palette.js`, un eje unico, leyenda para 2+ series, tooltips en hover), se construyeron:
- `VentasTrendChart` (linea, 2 series: Ventas y Margen de contribucion, mismo eje $) en el Dashboard, agrupando TODO el historial de ventas por mes calendario.
- `RentabilidadMeter`, un gauge circular hecho a mano en SVG (no via Recharts, es mas simple para un solo valor) que colorea el arco por severidad (verde/amarillo/rojo) segun la Rentabilidad neta del periodo seleccionado.
- `AbcScatterChart` en la pantalla ABC: dispersión de unidades vendidas vs. margen por unidad, con lineas de referencia en las medianas (los mismos limites que ya definen las 4 categorias en la tabla).

**Decisión de color para el scatter de ABC: colores de "estado", no categoricos**
Las 4 categorias ABC (estrella/caballo de batalla/enigma/perro) se pintaron con la paleta de estado (verde=bueno, amarillo=advertencia, naranja=serio, rojo=critico) en vez de 4 hues categoricos arbitrarios. Correr el validador de la skill confirmo que 4 colores categoricos con "todos los pares visibles a la vez" (como en un scatter) no pasan las pruebas de accesibilidad mas alla de 3 slots — pero la paleta de "estado" existe justamente para esto: cada categoria ABC es literalmente un juicio de "que tan bien le esta yendo a este platillo", no una identidad arbitraria. Se reforzó con codificación secundaria (las lineas de mediana ya delimitan el cuadrante visualmente, independiente del color) para no depender del color por si solo. Se actualizaron tambien los badges de la tabla ABC (antes verde/azul/morado/gris) para usar la misma paleta y ser consistentes con la grafica.

**Verificado en navegador**: 4,711 ventas generadas en ~2 segundos en 21 meses (Ene 2025 - Sep 2026); ticket promedio del mes actual $256.74; Estado de Resultados en "Año pasado" (2025 completo) muestra ingresos $597,055, utilidad neta $63,253.40 (positiva, cerrada, presentable); la grafica de tendencia muestra la curva de crecimiento completa; el gauge de rentabilidad y el scatter de ABC renderizan y responden al hover con tooltips correctos (confirmado disparando los eventos directamente sobre los elementos SVG, ya que la interaccion de mouse simulada del navegador no siempre dispara los eventos sinteticos de Recharts).

---

## 2026-09-08 — Scatter de ABC: de "puntitos abstractos" a etiquetas directas (con Claude Code)

El usuario probó el scatter de ABC recien construido y dijo no entenderlo bien ("no entiendo esa grafica mucho de los puntitos"). Diagnóstico: un scatter con medianas y cuadrantes es un concepto de analisis (tipo matriz BCG) que no es evidente por si solo para alguien sin ese vocabulario, aunque la grafica fuera tecnicamente correcta.

**Se intentaron fondos de cuadrante con color (ReferenceArea de Recharts) y no funcionaron bien**
Se probo pintar cada cuadrante con un tinte de color y su nombre (ESTRELLAS, ENIGMAS, etc.) usando `ReferenceArea` con limites omitidos para que se extendieran hasta el borde del eje. En la practica, Recharts no extendio las areas correctamente y las 4 etiquetas terminaron amontonadas cerca de las lineas de mediana en vez de en las 4 esquinas. Se descarto ese enfoque en vez de invertir mas tiempo depurando un comportamiento inconsistente de la libreria.

**Solucion que si funciono: nombre del platillo directo sobre cada punto (`LabelList`)**
Decisión: cada uno de los 8 puntos ahora muestra el nombre de su platillo justo encima, sin necesidad de pasar el mouse. Con solo 8 platillos el traslape de etiquetas es minimo y manejable (con cientos de puntos no seria viable, pero no es el caso aqui).
Por qué: es la forma mas directa de resolver la confusion — en vez de que el usuario tenga que decodificar "punto verde en la esquina superior derecha", ve literalmente "Hamburguesa clasica" ahi mismo.

**Las lineas de mediana ahora llevan una etiqueta de texto ("Mediana de ventas" / "Mediana de margen")**
Antes eran lineas punteadas sin explicacion. Ahora se nombran directamente sobre la propia linea, usando el `label` nativo de `ReferenceLine` (que si funciono de forma confiable, a diferencia de `ReferenceArea`).

**Se agrego una leyenda en lenguaje llano arriba de la grafica**
"Cada punto es un platillo... Mas a la derecha = se vende mas. Mas arriba = deja mas ganancia por unidad." — la misma logica de explicaciones en espanol sencillo que ya se usa en toda la app (`HelpIcon`, glosario), aplicada tambien dentro de una grafica.

---

## 2026-09-08 — Pantalla de "Ver" receta, de solo lectura (con Claude Code)

**Nueva ruta `/recetas/[id]/ver`, separada del constructor de edicion**
Decisión: se agregó una pantalla de solo lectura que muestra nombre, precio, IVA, food cost % y el detalle de insumos (cantidad, costo por unidad, subtotal, total), sin ningun campo editable ni boton de guardar. En la lista de Recetas, el nombre del platillo y un link "Ver" llevan aqui; "Editar" sigue llevando al constructor completo (`/recetas/[id]`), y desde la vista de solo lectura hay un boton "Editar" para saltar ahi si hace falta.
Por qué: el usuario señalo que la unica forma de ver que insumos lleva una receta era entrar a "Editar", lo cual expone campos y botones de guardar cuando la intencion era solo consultar. Separar "ver" de "editar" evita el riesgo de modificar algo por accidente y es mas rapido para una consulta simple.
No se toco el constructor de edicion (`/recetas/[id]`) — sigue siendo la misma pantalla para crear y editar, como ya estaba decidido; esta nueva ruta es puramente de consulta.

**Verificado en navegador**: `/recetas/1/ver` muestra Hamburguesa clasica con precio $120.00, IVA 16%, food cost 26.3%, y el desglose completo de sus 3 insumos con subtotales que suman correctamente $31.60, sin ningun input editable en la pantalla.

---

## 2026-09-08 — Detalle por concepto en el Estado de Resultados, sin tocar el resumen (con Claude Code)

**Boton "Ver detalle por concepto" en vez de rediseñar el reporte**
Decisión: se agregó un boton de texto debajo del resumen (`Ver detalle por concepto ▼` / `Ocultar detalle por concepto ▲`) que despliega 4 tablas nuevas, sin modificar el resumen de 6 renglones que ya existia:
1. **Ingresos por platillo** — cada receta con sus unidades vendidas y total facturado en el periodo.
2. **Costo de insumos directos por platillo** — cuanto costo en insumos cada receta vendida.
3. **Consumo de insumos indirectos por insumo** — Gas, Servilletas, Salsas de mesa, cada uno con su monto.
4. **Gastos de operacion por concepto** — cada gasto fijo (Renta, Nomina, Luz, etc.) con su monto para el periodo (ya multiplicado por los meses si aplica).
Por qué: el usuario pidio poder ver el detalle "a nivel conceptos" sin romper el reporte resumen, que ya le parecia bien logrado visualmente. Un boton colapsable logra ambas cosas: el resumen se ve exactamente igual por default, y el detalle esta a un clic sin necesitar una pantalla aparte.

**Los 4 desgloses se calculan a partir de datos que la pantalla ya tenia cargados, mas Insumos (nuevo fetch)**
Se agregó `api.getInsumos()` a la carga inicial de la pantalla (antes no se pedian) unicamente para poder mostrar el nombre de cada insumo indirecto en su desglose; el resto de los datos (ventas, recetas, consumo indirecto, gastos fijos) ya se cargaban para el resumen.

**Verificado en navegador**: con el detalle desplegado, la suma de "Ingresos por platillo" ($78,050.00 entre 8 platillos), "Costo de insumos directos por platillo" ($20,784.25), "Consumo de insumos indirectos por insumo" ($1,150.00) y "Gastos de operacion por concepto" ($30,500.00) coincide exactamente, renglon por renglon, con los totales ya mostrados en el resumen colapsado.

---

## 2026-09-08 — Subtotal en cada tabla de detalle del Estado de Resultados (con Claude Code)

Decisión: las 4 tablas de `DetalleTabla` (Ingresos por platillo, Costo de insumos directos, Consumo de insumos indirectos, Gastos de operacion) ahora muestran un renglon "Total" al final, calculado sumando las mismas filas que ya se estan mostrando (no un valor separado pasado desde el componente padre), para garantizar que el subtotal nunca pueda desincronizarse de lo que la tabla realmente lista.
Por qué: el usuario pidio poder confirmar que cada desglose "cuadra" con el resumen sin tener que sumar a mano ni desplazarse hacia arriba — es la convención esperada en cualquier cedula de detalle de un reporte financiero, y refuerza la confianza del reporte de cara a una entidad de financiamiento.

**Verificado en navegador**: los 4 "Total" mostrados ($78,050.00 / $-20,784.25 / $-1,150.00 / $-30,500.00) coinciden exactamente con "Ingresos por ventas", "Insumos directos", "Consumo de insumos indirectos" y "Gastos de operacion" del resumen colapsado.

---

## 2026-09-08 — Componente compartido para acciones de fila (Ver/Editar/Eliminar) (con Claude Code)

**Problema detectado**: "Editar" se veia como texto plano (`text-zinc-700`, casi negro, sin subrayado hasta el hover) en las 6 pantallas con tablas editables (Insumos, Recetas, Ventas, Gastos Fijos, Consumo Indirecto, Compra de insumos) — no se percibia como clicable en reposo.

**Se creo `components/RowActions.tsx`** con `VerLink`, `EditarLink`, `EditarButton` y `EliminarButton`, reutilizados en las 6 pantallas en vez de que cada una tuviera su propio `<button>`/`<Link>` con clases repetidas a mano.

**Decisión de color: azul fijo para Editar, NO el color de marca dinamico**
Se uso un azul convencional (`text-blue-700`) para Editar en vez de `var(--brand-primary)` (que ya se usa en botones principales en toda la app). Motivo: el negocio demo actual tiene su color primario en rojo (`#DC2626`) — si "Editar" tambien fuera rojo, se veria practicamente identico a "Eliminar" (tambien rojo, por convencion universal de peligro), justo el tipo de confusion que se queria resolver. Editar/Eliminar usan colores fijos e independientes de la paleta de marca a proposito.

**Se agregaron iconos (`lucide-react`: `Pencil`, `Trash2`, `Eye`)** junto a cada texto, reforzando la identidad de la accion mas alla del color (bueno para daltonismo y para que la intencion sea obvia de un vistazo).

**Verificado en navegador**: en Insumos, "Editar" se ve azul con lapiz y "Eliminar" rojo con bote de basura, distinguibles sin necesidad de hover; en Recetas, las tres acciones (Ver/Editar/Eliminar) se ven con sus propios iconos y colores (gris/azul/rojo).

---

## 2026-09-08 — Acciones de fila solo con icono (sin azul) y filtro de periodo en pantallas de captura (con Claude Code)

**Se revierte el azul fijo de "Editar" a gris neutro, y se quita el texto de las tres acciones**
Decisión: `components/RowActions.tsx` ahora renderiza solo el icono (sin la palabra "Ver"/"Editar"/"Eliminar"), con `title`/`aria-label` para tooltip y accesibilidad. "Ver" y "Editar" comparten un mismo gris neutro (`text-zinc-500`, fondo `zinc-100` en hover); "Eliminar" sigue siendo el unico en rojo.
Por qué: el usuario probo la version anterior (azul para Editar, entrada previa de esta bitacora) y señalo que el azul se veia "fuera de contexto" porque no aparece en ningun otro lado de la paleta de la app (rojo/gris de marca). Se cambio a la convencion mas comun en UI: **neutro = accion segura, rojo = accion destructiva unica**, en vez de introducir un tercer acento de color que no pertenece a la marca. Se aprovecho el mismo cambio para resolver un segundo comentario del usuario ("¿podemos poner solo iconos?"): con icono + tooltip es suficiente para reconocer la accion y se ve mas limpio en la tabla.

**Selector de periodo agregado a Ventas, Compra de insumos y Consumo indirecto; Gastos Fijos queda fuera a proposito**
Decisión: las 3 pantallas ahora tienen `PeriodSelector` (mismo componente ya usado en Dashboard y Estado de Resultados) y filtran tanto la tabla como el total mostrado segun el periodo elegido, usando `fechaEnPeriodo` de `lib/periodo.ts`. Gastos Fijos NO recibio el selector: cada renglon es un monto MENSUAL recurrente (Renta, Nomina, etc.), sin una fecha propia por registro — no hay "periodo" que filtrar ahi, es la lista completa de conceptos vigentes.
Por qué: el usuario señalo que solo el Dashboard y el Estado de Resultados permitian acotar por periodo; en Compra de insumos y Consumo indirecto en particular, el total mostrado quedaba fijo al mes calendario actual sin poder ver, por ejemplo, solo el mes pasado o el año completo. Se reutilizo el mismo componente y la misma funcion de filtrado ya validados en otras pantallas, en vez de crear una logica de fechas nueva.

**Verificado**: type-check de TypeScript limpio (`npx tsc --noEmit`, sin errores) tras los cambios en `RowActions.tsx`, `ventas/page.tsx`, `egresos/compras-insumos/page.tsx` y `consumo-indirecto/page.tsx`.

---

## 2026-09-08 — Sidebar reagrupado por rol de pantalla, y periodo compartido entre pantallas (con Claude Code)

**Sidebar: de agrupar por "ingreso vs. egreso" a agrupar por rol (captura vs. analisis)**
Decisión: se fusionaron los grupos "Operacion diaria" (solo Ventas) y "Egresos" (Compra de insumos, Consumo indirecto, Gastos fijos) en un solo grupo **"Movimientos"** que incluye las 4 pantallas de captura de datos. La estructura del sidebar queda: Catalogos (Insumos, Recetas) / Movimientos (Ventas, Compra de insumos, Consumo indirecto, Gastos fijos) / Reportes (Resumen, Estado de resultados, ABC) / Configuracion.
Por qué: el usuario señaló la inconsistencia de que "Operacion diaria" agrupaba por direccion del flujo de dinero (ingreso) mientras Reportes ya mezcla ingresos y egresos en el Estado de Resultados — dos logicas de agrupacion distintas conviviendo. Agrupar por rol (que tipo de accion permite la pantalla: dar de alta/editar/eliminar vs. solo consultar) es mas consistente y evita un grupo ("Egresos") que hubiera quedado vacio si sus reportes ya viven en Reportes. Se descarto el nombre "Operacion diaria" para el grupo fusionado (Gastos Fijos no se toca a diario) a favor de "Movimientos", termino estandar en apps financieras para "todo lo que se registra".

**Selector de periodo: de estado local por pantalla a un Context global (`PeriodoProvider`)**
Decisión: se creó `lib/periodo-context.tsx` (`PeriodoProvider`/`usePeriodo`), montado una sola vez en `AppShell.tsx` envolviendo el `<main>`. Dashboard, Ventas, Compra de insumos, Consumo indirecto y Estado de Resultados ahora leen/escriben el mismo periodo compartido en vez de tener cada una su propio `useState<PeriodoTipo>("mes_actual")`. ABC sigue sin selector, sin cambios (decision ya documentada: siempre "todo el historial").
Por qué: el usuario señaló que el selector "no le cuadraba" al cambiar de pantalla — la causa real no era la posicion visual (que ya era consistente) sino que la seleccion se reiniciaba a "Este mes" en cada pantalla por tener estado independiente. Con un Context global, elegir "Mes pasado" una vez se mantiene al navegar entre las 5 pantallas que usan periodo.

**Nuevo componente `components/PageHeader.tsx` para el encabezado de cada pantalla**
Decisión: título + subtítulo a la izquierda y `PeriodSelector` (opcional, via prop `mostrarPeriodo`) a la derecha, en un layout identico en las 5 pantallas, reemplazando el `<div className="flex ... justify-between">` que cada pantalla armaba a mano por separado.
Por qué: garantiza que la posicion del selector sea *pixel-identica* en toda pantalla que lo use, en vez de depender de que cada desarrollador copie el mismo patron de clases sin variaciones accidentales.

**Verificado**: `npx tsc --noEmit` sin errores tras el refactor en `Sidebar.tsx`, `AppShell.tsx`, `lib/periodo-context.tsx`, `components/PageHeader.tsx` y las 5 pantallas migradas.

---

## 2026-09-08 — Se elimina "Compra de insumos"; Gastos Fijos pasa a ser captura mensual con precarga (con Claude Code)

Sesión larga de análisis con el usuario cuestionando por qué "Compra de insumos" se sentía innecesaria y por qué comparar periodos con Gastos Fijos daba resultados poco confiables. Se evaluaron varias soluciones incrementales (fecha de vigencia, baja lógica) antes de concluir que el diseño correcto era más simple que cualquiera de los parches — quitar la causa raíz en vez de compensarla.

**Se elimina la pantalla y el modelo "Compra de insumos" por completo**
Decisión: se borraron `app/models/compra_insumo.py`, `app/schemas/compra_insumo.py`, `app/routers/compras_insumo.py`, la ruta `/egresos/compras-insumos` del frontend, sus tipos (`CompraInsumo`/`CompraInsumoInput`) y métodos de `lib/api.ts`, su entrada en el sidebar, y su generación en `seed_data.py`.
Por qué: la pantalla hacía dos cosas y ninguna era indispensable — (1) actualizar `costo_por_unidad_base`, que ya hace la calculadora de compra dentro de "Insumos" al editar; (2) mostrar "cuánto gasté este mes en compras", un dato que no se usaba en ningún reporte de la app (no hay flujo de efectivo). El usuario señaló correctamente que el modelo de la app nunca fue "cuánto salió de mi bolsillo" sino "cuánto cuesta cada platillo" — la pantalla rompía esa lógica al intentar ser, a medias, un registro de caja. La calculadora de compra dentro de Insumos se mantiene sin cambios (sigue siendo la forma de actualizar el costo de referencia); solo se quitó el registro fechado paralelo.

**Gastos Fijos deja de ser un catálogo "vigente para siempre" y pasa a ser captura mensual, igual que Consumo Indirecto**
Decisión: `GastoFijo` gana un campo `periodo` (mes, mismo tipo que ya usa `ConsumoIndirecto`). Cada registro es "este concepto, este monto, en este mes", no "este concepto para siempre". Dashboard y Estado de Resultados dejaron de calcular `(total actual) × (meses del periodo)` y ahora filtran los gastos fijos reales de cada periodo con `fechaEnPeriodo`, exactamente como ya se hacía con Consumo Indirecto. Se eliminó la función `mesesEnPeriodo` de `lib/periodo.ts` por quedar sin uso.
Por qué: el usuario detectó el problema de raíz al probar comparativas entre periodos — si editas un gasto fijo hoy, la versión anterior del modelo aplicaba tu configuración ACTUAL a cualquier periodo que consultaras, incluyendo el pasado (agregar un gasto hoy "ensuciaba" el año pasado; eliminarlo lo hacía desaparecer del histórico). Se evaluaron soluciones intermedias (`fecha_alta`/`fecha_baja` con baja lógica) pero el usuario mismo notó que eso solo trasladaba el problema (¿y si cambia el monto?) sin resolverlo de raíz, y que además era más ingeniería que cualquier otra feature ya construida para un caso que probablemente no sale en un pitch con datos curados. La solución elegida no es un parche: es aplicarle a Gastos Fijos el mismo patrón que Consumo Indirecto ya usaba desde el principio sin este problema.

**Precarga automática del mes anterior, para no perder la comodidad de "configúralo una vez"**
Decisión: si el mes que se está capturando no tiene gastos fijos registrados y existe un mes anterior con datos, la pantalla muestra un aviso ("Aún no registras tus gastos fijos de [mes]. Copiar los de [mes anterior]") con un botón que duplica esos registros al mes en curso, ya editables. El caso común (nada cambió) se resuelve con un clic; el caso que le interesaba al usuario (algo cambió, ej. bajó la nómina por una falta) se resuelve editando o borrando el registro copiado antes de guardar, sin afectar ningún otro mes.
Por qué: capturar renta/nómina/luz desde cero cada mes hubiera sido fricción real para algo que casi nunca cambia; la precarga hace que el modelo mensual (más correcto) cueste lo mismo que el catálogo anterior en el caso común.

**Efecto secundario (mejora, no solo refactor): se corrigió un cálculo que ya estaba mal**
Al implementar el filtrado por periodo se descubrió que "Rentabilidad neta" en el Dashboard, en su comparación "vs. periodo anterior", usaba el total de Gastos Fijos ACTUAL tanto para el periodo en curso como para el anterior — si el usuario editaba un gasto fijo entre un mes y otro, esa tendencia específica quedaba silenciosamente mal. Con gastos fijos ya fechados, el periodo anterior ahora calcula su propio total real (`fechaEnPeriodo(g.periodo, periodo, true)`), sin código adicional para lograrlo. Tampoco fue necesario agregar ninguna limitación a "Alcance del MVP" sobre este tema — el problema dejó de existir en vez de quedar documentado.
Nota aparte: "Punto de equilibrio" siempre usa los gastos fijos del mes de calendario real actual (no del periodo que se esté viendo en el dashboard), porque es una pregunta mensual por definición ("cuántos platillos necesitas vender AL MES"), independiente del selector de periodo.

**Verificado en navegador**: tras `reset-demo`, Gastos Fijos muestra 126 registros (6 conceptos × 21 meses) con el mismo total mensual de siempre ($30,500.00); Estado de Resultados en "Año pasado" (2025) sigue dando exactamente los mismos números ya verificados antes de este cambio (ingresos $597,055.00, utilidad neta $63,253.40), confirmando que el rediseño no altera las cifras demo, solo cómo se calculan. Se probó la precarga creando un mes nuevo (octubre 2026) sin datos: apareció el aviso, el botón copió los 6 conceptos correctamente, y se revirtió con `reset-demo` al terminar la prueba. El desglose "Gastos de operación por concepto" en el Estado de Resultados ahora suma registros reales por concepto en vez de multiplicar un solo valor, y coincide exacto con el resumen (Nómina $-216,000.00, Renta $-108,000.00, etc., total $-366,000.00 en el año).

---

## 2026-09-09 — El selector de periodo se mueve junto al historial, no arriba de todo (con Claude Code)

**Problema detectado por el usuario**: en Ventas, Consumo Indirecto y Gastos Fijos, el `PeriodSelector` vivía en el `PageHeader`, arriba de TODO (incluyendo el formulario de captura). Aunque solo filtra la tabla de historial de abajo, su posición hacía parecer que era un filtro general de toda la pantalla — incluido el formulario, al cual no le pega en absoluto. El usuario lo diagnosticó con precisión: "si ese filtro se lo pusieras arriba de la tabla y no del formulario, se sentiría más natural".

**Decisión: el selector se queda en el `PageHeader` solo en pantallas de puro reporte; se baja a la sección de historial en pantallas hibridas (formulario + tabla)**
- **Dashboard y Estado de Resultados**: sin cambios. Ahí el selector sí afecta todo lo que hay debajo (KPIs, gráficas, el reporte completo), así que su posición arriba de todo es honesta.
- **Ventas, Consumo Indirecto, Gastos Fijos**: se quitó `mostrarPeriodo` del `PageHeader` (que ahora solo muestra título/subtítulo) y el `PeriodSelector` se movió a una nueva franja "Historial" (encabezado + selector en la misma fila) colocada justo encima de la tabla y su total, después del formulario. La cercanía ahora sí coincide con lo que el control realmente afecta.
Por qué: es una excepción justificada a la regla de "`PageHeader` siempre igual" fijada antes en la sesión — esas 3 pantallas dejaron de ser reportes puros el día que se volvieron híbridas (captura + historial), así que tiene sentido que su encabezado se vea distinto a propósito.

**Verificado en navegador**: en las 3 pantallas, el formulario de captura ahora aparece sin ningún control de periodo cerca; la franja "Historial" con su selector aparece inmediatamente antes de la tabla y el total, en las tres de forma consistente entre si. Dashboard no se modificó y sigue mostrando las mismas cifras de siempre.

---

## 2026-09-09 — Monto en pesos de la Rentabilidad neta, dentro del mismo gauge (con Claude Code)

**Decisión**: `RentabilidadMeter` gana una prop opcional `montoPesos`, mostrada como una línea debajo del porcentaje y encima de la etiqueta de estado (Saludable/Ajustada/Perdidas). El Dashboard le pasa `utilidadNeta = margenContribucionTotal - gastosFijosTotales` (el mismo calculo que ya alimenta el porcentaje).
Por qué: el usuario notó que el Dashboard solo mostraba la Rentabilidad neta como porcentaje, sin el equivalente en pesos ("¿cuánto dinero me quedó de ganancia?"). Se descartó agregar una tarjeta KPI nueva y separada para no dar la impresión de que son dos métricas distintas — es el mismo número en dos unidades, así que vive junto, dentro del mismo widget, reforzando esa relación en vez de fragmentarla. No se le agregó su propia flecha de tendencia: la tarjeta de "Rentabilidad neta" ya la muestra para el porcentaje, y duplicarla para el monto en pesos hubiera sido redundante en un widget pensado para ser compacto.

**Verificado en navegador**: el gauge ahora muestra "34.3%" / "$26,765.75" / "Saludable" — el monto coincide exacto con Margen de contribución ($57,265.75) menos Gastos fijos del mes ($30,500.00).

**Ajuste de jerarquía visual**: a pedido del usuario, el monto en pesos pasó de `text-sm` gris a `text-3xl font-bold`, coloreado con el mismo color de estado que ya usa el arco del gauge (verde/amarillo/rojo segun `colorPorRentabilidad`). Por qué: es "el resultado final del empresario" — el número que de verdad le importa al dueño del negocio — y ese peso visual debía reflejarlo, en vez de quedar como una nota secundaria pequeña debajo del porcentaje.

---

## 2026-09-09 — "Ver" en Insumos, y confirmación antes de eliminar en toda la app (con Claude Code)

**Nueva ruta `/insumos/[id]/ver`, solo lectura**
Decisión: se agregó el mismo patrón ya usado en Recetas — un ícono "Ver" en la tabla de Insumos que lleva a una pantalla de solo lectura con el detalle del insumo (tipo de uso, magnitud, costo por unidad) y, a diferencia de la tabla (que ya muestra esos mismos campos), agrega algo que no se ve en ningún otro lado: la lista de recetas que usan ese insumo y la cantidad exacta que cada una consume. Se agregó `api.getInsumo(id)` al cliente (el backend ya soportaba `GET /insumos/{id}` via el CRUD generico, solo faltaba exponerlo).
Por qué: el usuario pidió una vista clara de cada registro; como los campos propios del insumo ya eran visibles en la tabla, el valor real de una vista dedicada era mostrar el "impacto" del insumo (en qué platillos afecta un cambio de precio), no repetir la misma fila.
El botón "Editar" que sí tiene la vista de Recetas no se replicó aqui: Insumos no tiene una ruta de edición dedicada (`/insumos/[id]`) — edita en linea desde la misma tabla — asi que la vista de solo lectura solo ofrece "Volver a Insumos".

**Confirmación antes de eliminar, ahora consistente en toda la app**
Decisión: se agregó `if (!confirm("...")) return;` al inicio de `handleDelete` en Insumos, Ventas, Consumo Indirecto y Gastos Fijos — el mismo patrón que ya existía en Recetas y en el boton de reset de datos demo, pero que faltaba en esas 4 pantallas (un clic en el bote de basura borraba de inmediato, sin poder arrepentirse).
Por qué: el usuario preguntó explícitamente si "Eliminar" pedía confirmación en Insumos; al revisar se encontró que era un hueco real y generalizado (no solo en Insumos), asi que se corrigió en las 4 pantallas que le faltaba en la misma pasada, en vez de dejar el mismo riesgo latente en las demás.

**Verificado en navegador**: `/insumos/1/ver` (Carne de res) muestra correctamente sus 3 recetas relacionadas (Hamburguesa clasica 150g, Hamburguesa con queso doble 200g, Alambre de res 250g) con costo por unidad y tipo/magnitud correctos.

---

## 2026-09-09 — HelpIcon explicando la formula del costo por unidad base (con Claude Code)

**Decisión**: se agregó un `HelpIcon` junto a "Costo por unidad base" en la tabla de Insumos y en la pantalla de solo lectura `/insumos/[id]/ver`, con el texto: *"Se calcula dividiendo lo que pagaste entre la cantidad comprada, convertida a la unidad base (gramos, mililitros o piezas). Ej. $160 por 1 kg = $0.16 por gramo."*
Por qué: el usuario pregunto que formula explicaba un valor como "$0.16 por gramo" en Carne de res. Se aclaro que la app NO guarda los datos originales de la compra (precio pagado, cantidad, unidad) una vez calculado el costo — solo el resultado final — asi que no es posible reconstruir el desglose especifico de un insumo ya guardado, solo explicar la formula en general. El usuario pidio explicitamente NO tocar el modelo de datos por estar a punto de hacer una demo a su equipo, asi que se opto por la explicacion generica en vez de agregar campos para guardar el desglose historico.

**Verificado en navegador**: el tooltip se abre correctamente en ambas pantallas con el texto esperado; sin cambios en backend, modelo de datos, ni comportamiento de calculo — cambio puramente de UI explicativa.

**Bug encontrado y corregido: el tooltip de la tabla de Insumos se recortaba y no se veia**
El contenedor de la tabla usa `overflow-hidden` (para redondear las esquinas). El `HelpIcon` por defecto abre su tooltip hacia arriba (`bottom-full`) - al estar en el encabezado de la tabla, pegado al borde superior del contenedor, el tooltip se renderizaba parcialmente por fuera del area visible y `overflow-hidden` lo recortaba, dejando el texto invisible.
Corrección: `HelpIcon` gana una prop opcional `direccion` (`"arriba"` por defecto, sin cambios para los ~20 usos existentes en formularios; `"abajo"` para abrir hacia abajo). Se uso `direccion="abajo"` unicamente en el encabezado de la tabla de Insumos, donde abrir hacia arriba causaba el recorte.
Verificado con el DOM directamente (no solo visualmente): el `getBoundingClientRect()` del tooltip ahora cae completamente dentro de los limites del contenedor `overflow-hidden` (antes su borde superior quedaba fuera).

---

## 2026-09-09 — Identidad del producto: "Mi Cuenta Conmigo" (con Claude Code)

El usuario compartió el logo definitivo del PRODUCTO/software (no del negocio demo) para el pitch: "Mi Cuenta Conmigo", con paleta verde/azul marino/naranja.

**Se aclaró explícitamente el alcance antes de tocar código**: "Mi Cuenta Conmigo" es el nombre de la app/software que se presenta a los jueces, NO el nombre del restaurante ficticio de la demo. Por eso no se tocó `ConfiguracionNegocio` (sigue siendo "Sazon de Barrio", editable por el usuario final como siempre) — son dos identidades distintas y no debían mezclarse: una es la marca del software, la otra es la marca configurable de CADA negocio que lo use.

**Cambios**:
- `app/icon.png`: el logo reemplaza el favicon default de Next.js (se eliminó el `favicon.ico` heredado de `create-next-app` para que no compita con el nuevo icono).
- `app/layout.tsx`: `metadata.title` cambia a "Mi Cuenta Conmigo" (el nombre de pestaña del navegador); se agregó `viewport.themeColor` con el verde de marca (`#149968`, extraído por muestreo de píxeles del logo).
- `components/Sidebar.tsx`: se agregó un crédito discreto al pie del sidebar (logo pequeño + "Mi Cuenta Conmigo" en el azul marino de marca + subtítulo), debajo de la navegación, sin tocar el `BrandHeader` de arriba (que sigue siendo 100% la marca del negocio configurado).
- Paleta extraída del logo por muestreo de píxeles (no a ojo): verde `#149968`, azul marino `#123256`, naranja `#FC8E1E` como acento terciario si hiciera falta a futuro.

**Verificado en navegador**: pestaña del navegador muestra "Mi Cuenta Conmigo"; el unico favicon registrado es `icon.png` (ya no compite con el `favicon.ico` viejo); el logo carga sin error 404 (`naturalWidth: 1408`); el pie del sidebar muestra el crédito correcto; el header/sidebar de arriba sigue mostrando "Sazon de Barrio" sin cambios.

**Corrección: el crédito quedaba casi invisible al fondo del sidebar**
El usuario probó la app y solo notó el logo como favicon — el crédito al pie del sidebar existía pero, al estar dentro del mismo contenedor con scroll que la navegación (`overflow-y-auto` en el `<aside>` completo), quedaba empujado fuera de vista si el menu no cabía en la pantalla.
Corrección: se reestructuró `Sidebar.tsx` para que el scroll viva solo en `<nav>` (`flex-1 overflow-y-auto`), dejando el crédito como un bloque fijo fuera del area con scroll (`shrink-0`) — así siempre es visible al fondo del sidebar sin importar cuanto mida la navegación. Tambien se agrando el logo (6→9) y el texto para que se note mas.

**Falso positivo aclarado: el círculo negro con "N" era el indicador de desarrollo de Next.js, no un bug**
El usuario reportó ver un círculo negro con una "N" tapando el logo nuevo. Se descartó que fuera parte del codigo (no existe ningun componente asi en el proyecto) y que fuera una extension del navegador (el usuario lo confirmo en una ventana normal, no solo en el panel de Claude Code). Al pedirle que lo abriera, resultó ser el **Next.js Dev Tools indicator** — el badge nativo que Next.js dibuja en la esquina inferior izquierda durante `next dev` (muestra Route/Bundler/Route Info), coincidiendo justo con la posicion del nuevo credito de marca.
Decisión: se agregó `devIndicators: false` a `next.config.ts` para desactivarlo. Es un ajuste puramente cosmetico de modo desarrollo (nunca aparece en produccion de cualquier forma) que evita el choque visual con el credito de "Mi Cuenta Conmigo" durante la demo en vivo.
**Verificado en navegador**: tras reiniciar el servidor, el badge de Next.js ya no aparece y el logo real de "Mi Cuenta Conmigo" se ve sin obstrucciones en la esquina inferior del sidebar.

**Ajuste: el logo se veia diminuto porque el PNG original trae mucho margen en blanco**
El archivo original (1408x768) tiene el logo real (icono + texto) ocupando solo una franja central pequeña, rodeada de bastante lienzo en blanco — al mostrarlo completo en un espacio chico, la mayor parte era espacio vacio y el logo se veia minusculo, ilegible.
Corrección: se detectó la caja real del contenido por densidad de píxeles saturados (no por color exacto, para ignorar el ruido de textura de papel del fondo y un pequeño destello decorativo suelto), y se generó `public/logo-mi-cuenta-conmigo-cropped.png` (468x554) recortado justo al icono + texto, sin margenes. El credito del sidebar ahora usa esta version recortada, ajustada en varias iteraciones a pedido del usuario (`h-20` → `h-[104px]` → `h-[125px]`) — mucho mas grande y legible — y se quitó el texto duplicado "Mi Cuenta Conmigo" que estaba a un lado (el logo recortado ya trae el nombre escrito) — solo queda el logo y, debajo, el tagline "Gestion financiera para tu negocio". Se verificó que el mismo credito se ve correctamente tanto en el sidebar fijo de escritorio como en el menu deslizable movil (ambos reusan el mismo componente `Sidebar`).

---

## 2026-09-09 — Paleta por default de la app acorde al logo (con Claude Code)

**Decisión**: se cambiaron los colores de FALLBACK/DEFAULT (no los del negocio demo activo) a los tonos del logo "Mi Cuenta Conmigo": verde `#149968` como primario, azul marino `#123256` como secundario. Se actualizaron los 4 lugares donde vivian estos defaults:
- `backend/app/models/configuracion_negocio.py`: default de columna `color_primario`/`color_secundario` (antes rojo/gris, herencia del negocio demo original).
- `frontend/app/globals.css`: variables `--brand-primary`/`--brand-secondary` en `:root` (antes negro/gris, usadas por `.btn-primary` y como valor inicial antes de que `BrandHeader` aplique la configuracion real).
- `components/Sidebar.tsx`: los fallbacks literales `var(--brand-primary, ...)` / `var(--brand-secondary, ...)` (en la practica casi nunca se usan porque `globals.css` ya define la variable, pero se alinearon por consistencia).
- `app/configuracion/page.tsx`: el estado inicial de los inputs de color antes de que cargue la configuracion real.

Por qué: el usuario pidio que la paleta "por default" de la app fuera acorde al logo del producto. Se aclaró el alcance explícitamente: esto es el color que veria un negocio NUEVO sin configurar aun (o el flash inicial antes de cargar datos) — **no** se tocó la configuracion activa del negocio demo ("Sazon de Barrio", que sigue en rojo `#DC2626`/gris `#1F2937`, ya curada y verificada en sesiones anteriores). Son dos conceptos distintos, igual que se distinguió antes entre la marca del producto y la marca del negocio demo.

**Verificado**: `GET /configuracion-negocio` sigue devolviendo el rojo del negocio demo sin cambios; en el navegador, el nav activo ("Resumen") se sigue pintando de rojo (la configuracion real persistida manda sobre el default).

**Corrección: el usuario esperaba ver el cambio reflejado en la app real, no solo en el fallback**
Al ver la pantalla de Configuración > Negocio, el usuario señaló que los colores seguian en rojo/gris (los del negocio demo persistido) — la distincion "default vs. configuracion activa" no era lo que el usuario queria: para su demo, queria que TODA la app (botones, nav activo, etc.) usara la paleta del logo, sin importar si tecnicamente es "el default" o "la configuracion del negocio actual".
Decisión: se actualizó tambien la configuracion ACTIVA del negocio demo "Sazon de Barrio" al verde/azul marino (via `PUT /configuracion-negocio`), y se actualizó `DEMO_CONFIGURACION` en `seed_data.py` para que un futuro "Restablecer datos de ejemplo" no la regrese a rojo. El nombre y eslogan del negocio NO se tocaron (segun se aclaro antes, esos siguen siendo identidad del negocio, no del producto) — solo los colores, que es lo unico que el usuario señalo como inconsistente.

**Verificado en navegador**: `/configuracion` ahora muestra "#149968"/"#123256" como colores guardados, la vista previa del boton principal y "Guardar configuracion" se pintan en verde.

---

## 2026-09-09 — Flujo de Efectivo (con Claude Code)

Sesión larga de análisis (documentada en los mensajes previos de esta conversación) culminó en la implementación completa de un reporte de Flujo de Efectivo, cerrando el hueco identificado hace varias sesiones ("la app dice si eres rentable, no si tienes dinero disponible").

**Cambios de modelo de datos**
- `ConsumoIndirecto`: +`medio_pago` (efectivo/banco).
- `CompraInsumo`: tabla recreada (se había eliminado antes) — insumo, fecha, unidad/cantidad/precio, `medio_pago`, y un campo transitorio `actualizar_costo_referencia` (solo en el schema de entrada, no se persiste) que le indica al router si debe actualizar `Insumo.costo_por_unidad_base` como efecto secundario. Por default viene en `true` (checkbox marcado por default en el formulario), pero el usuario lo puede desmarcar para compras atípicas (ej. una compra de emergencia) sin que distorsione el costeo de sus recetas — Opción "C" del análisis: comodidad de un solo paso en el caso normal, control explícito en el caso raro.
- `ConfiguracionNegocio`: +`saldo_inicial_efectivo`, +`saldo_inicial_banco`, +`fecha_saldo_inicial` — el punto de partida para calcular un saldo acumulado, capturable en Configuración.

**Pantalla nueva: `/flujo-efectivo`** (en Reportes, junto a Estado de Resultados)
Muestra dos bloques: **Movimiento neto del periodo** (entradas − salidas, solo del periodo seleccionado, separado efectivo/banco/total) y **Saldo estimado a la fecha** (saldo inicial + todo lo registrado desde `fecha_saldo_inicial` hasta el final del periodo que se esté viendo — se agregó `finDePeriodo()` a `lib/periodo.ts` para calcular esa fecha de corte por tipo de periodo). Incluye "Ver detalle por concepto" con desgloses de ingresos por platillo y egresos por compra de insumos/consumo indirecto/gastos fijos, igual que Estado de Resultados. Nota de limitaciones visible (asume cobro/pago el mismo día, no incluye movimientos fuera de la app como retiros personales).

**Compra de Insumos regresa a Movimientos**, con medio de pago y el checkbox de actualización de costo.

**Alcance del MVP actualizado**: la limitación de "Flujo de efectivo" se reescribió para reflejar que ahora existe una versión simplificada, en vez de declararlo como ausente.

**Datos demo**: se regeneró `seed_data.py` con `COMPRAS_INSUMO_BASE` (igual patrón que antes de eliminarla) y `medio_pago` aleatorio (65/35, mismo `PCT_BANCO`) en Consumo Indirecto y Compras. `DEMO_CONFIGURACION` ahora incluye un colchón inicial de $45,000 repartido 70/30 banco/efectivo ($31,500/$13,500), fechado enero 2025 (inicio del historial).

**Verificado en navegador**: Compra de Insumos con el checkbox marcado sí actualizó `Insumo.costo_por_unidad_base` (comprobado contra la API: $0.16 → $0.20); Consumo Indirecto muestra la columna de medio de pago; Configuración muestra el saldo inicial correctamente; Flujo de Efectivo renderiza el resumen y el detalle con números que cuadran contra Estado de Resultados (mismos $78,050.00 de ingresos); Estado de Resultados y Dashboard no sufrieron ninguna regresión.

**Hallazgo: excedente de efectivo acumulado en el demo, declarado como limitación en vez de corregido con más código**
El saldo acumulado de "Efectivo" en el demo sale desproporcionadamente alto ($376,984 vs. $26,903 en Banco) tras 21 meses. No es un bug del cálculo — es una consecuencia real de que los Gastos Fijos (la salida de dinero más grande, $30,500/mes) están casi todos etiquetados como "banco" desde una sesión anterior (Renta, Nómina, Luz, Agua, Internet = banco; solo Mantenimiento = efectivo), mientras que Ventas reparte 65/35 banco/efectivo. Banco absorbe casi todo el egreso pero solo 65% del ingreso; efectivo casi no tiene egreso pero sí recibe 35% del ingreso.
El usuario identificó correctamente el mecanismo real que explica esto: en la vida real, un negocio haría traspasos periódicos de su caja chica hacia el banco (depositar el efectivo acumulado) — algo que la app no modela. Se decidió explícitamente NO construir esa funcionalidad esta noche (ya se agregaron 4 piezas nuevas de una sola sentada: Compra de Insumos, medio de pago en Consumo Indirecto, saldo inicial, Flujo de Efectivo) y en su lugar declararlo como limitación consciente, en la misma nota donde ya se menciona que no se incluyen retiros personales del dueño — tanto en la pantalla de Flujo de Efectivo como en Alcance del MVP. No se tocaron datos demo ni proporciones ya verificadas (`PCT_BANCO`, medios de pago de Gastos Fijos).

---

## 2026-09-09 — Traspasos entre caja y banco (con Claude Code)

Cierre del hilo de análisis sobre el excedente de efectivo en el demo: en vez de solo declarar el hueco o rebalancear artificialmente los gastos fijos (lo cual hubiera contradicho deducibilidad fiscal real, ya que Renta y Nómina deben pagarse por banco), se construyó el mecanismo real que un negocio usaría: depositar periódicamente su efectivo acumulado al banco.

**Modelo nuevo, chico y de un solo propósito: `TraspasoCaja`**
Campos: fecha, monto, `direccion` (`caja_a_banco` | `banco_a_caja`, nuevo enum `DireccionTraspaso`), nota opcional. No toca Estado de Resultados en absoluto — es una reasignación entre las dos cuentas del mismo negocio, no un ingreso ni un gasto. Router con CRUD genérico (sin efectos secundarios, a diferencia de Compra de Insumos).

**Pantalla nueva `/traspasos-caja`** en Movimientos, mismo patrón que las demás pantallas de captura (formulario + historial con `PeriodSelector`).

**Flujo de Efectivo actualizado**: tanto el "movimiento neto del periodo" como el "saldo estimado a la fecha" ahora restan/suman el neto de traspasos (`caja_a_banco` resta de efectivo y suma a banco; `banco_a_caja` al revés) — el total combinado nunca cambia por un traspaso, solo la distribución entre las dos cuentas. Se agregó una quinta tabla de detalle ("Traspasos entre caja y banco") a la vista expandible.

**Datos demo**: cada mes del historial genera un traspaso `caja_a_banco` por el 80% de lo que se cobró en efectivo ese mes (`PCT_TRASPASO_EFECTIVO = 0.80`), dejando un colchón de trabajo en caja — imita la práctica real de depositar la mayor parte del efectivo cobrado, sin dejarlo acumulándose sin trazabilidad.

**Resultado del hallazgo anterior, ahora corregido con datos reales (no solo con un mensaje de texto)**: el saldo acumulado de efectivo bajó de $376,984 a **$44,340** (un colchón de trabajo razonable), y el de banco subió a **$359,547.50** (la mayoría del dinero del negocio, como corresponde). Se actualizaron las notas de limitación en Flujo de Efectivo y Alcance del MVP para reflejar que los traspasos ya se registran (antes decían que quedaban fuera de esta versión).

**Idea futura, anotada pero NO construida hoy** (a petición explícita del usuario, para no seguir agregando alcance esta noche): accesos directos desde otras pantallas de la app (ej. un botón en el Dashboard o en Flujo de Efectivo mismo) que inviten al usuario a registrar un traspaso cuando su saldo de efectivo se ve alto — la idea de "incitar siempre al usuario a tener su dinero en el banco" de forma más proactiva que solo el formulario dedicado.

**Verificado en navegador**: script de validación en Python confirmó los saldos antes de tocar la base real; se probó dar de alta un traspaso desde la UI (se reflejó correctamente en el historial y en Flujo de Efectivo), y se limpió con `reset-demo`. Dashboard y Estado de Resultados no sufrieron ninguna regresión.

---

## 2026-09-09 — Detalle de Flujo de Efectivo: separado por efectivo/banco, no solo el total (con Claude Code)

El usuario notó que el "Ver detalle por concepto" de Flujo de Efectivo era una copia directa del de Estado de Resultados (un solo valor por renglón), sin la dimensión que le da sentido a este reporte especificamente: cuanto de cada concepto entro/salio en efectivo vs. en banco.

**Decisión**: se reemplazó `DetalleTabla` (de un solo valor) por un nuevo componente `DetalleTablaFlujo` en las 3 tablas que sí aplican (Ingresos por platillo, Egresos por compra de insumos, Egresos por consumo indirecto, Egresos por gastos fijos) — ahora cada renglón muestra 3 columnas: Efectivo, Banco, Total. Las agrupaciones (`ingresosPorReceta`, `egresosComprasPorInsumo`, `egresosConsumoPorInsumo`, `egresosPorGastoFijo`) se modificaron para acumular por `medio_pago` en vez de un solo total. La tabla de "Traspasos entre caja y banco" se dejó con el `DetalleTabla` original (de un solo valor) porque un traspaso ES la separación entre las dos cuentas, no tiene sentido volver a partirlo por medio de pago.

Por qué: sin esto, el desglose de Flujo de Efectivo no aportaba nada que Estado de Resultados no diera ya — la razón de ser de este reporte es precisamente la distinción efectivo/banco, y el detalle no la reflejaba.

**Verificado en navegador**: las 4 tablas muestran columnas Efectivo/Banco/Total que suman correctamente contra los totales ya conocidos (ej. Gastos fijos: $-800.00 efectivo + $-29,700.00 banco = $-30,500.00, coincide con Estado de Resultados). Se confirmó tambien, en una pestaña nueva sin cache de HMR, que no quedan errores de consola.

---

## 2026-09-09 — Bug corregido: el Dashboard no coincidia con Estado de Resultados (con Claude Code)

El usuario notó que "Rentabilidad neta" en el Dashboard ($26,765.75) no coincidía con "Utilidad de operación / neta" en Estado de Resultados ($25,615.75) para el mismo periodo — una diferencia de exactamente $1,150.00.

**Causa raíz encontrada**: `calcularIndicadoresPeriodo` (en `lib/indicadores.ts`), usada por el Dashboard para Margen de contribución, Rentabilidad neta y Punto de equilibrio, **nunca incluía el Consumo de insumos indirectos** en su cálculo de costo — solo restaba `costo_insumos_snapshot` (insumos directos). Estado de Resultados sí lo incluye correctamente (ambos caen bajo "costo de ventas"). La diferencia de $1,150.00 era exactamente el consumo indirecto de ese mes, desaparecido del cálculo del Dashboard. Probablemente un descuido de cuando se agregó Consumo Indirecto al proyecto: se actualizó Estado de Resultados pero no esta funcion compartida.

**Corrección**:
- `calcularIndicadoresPeriodo` ahora recibe `consumoIndirecto` como parametro, calcula `costoIndirectoTotal`, y lo resta en `margenContribucionTotal` (de donde se derivan Rentabilidad neta y Punto de equilibrio). `costoVariableTotal` y `foodCostPct` se dejaron sin cambio (solo insumos directos), porque "costo de alimentos %" es, por convencion de la industria restaurantera, especificamente el costo de comida, no de insumos de uso general (servilletas, gas).
- `calcularRentabilidadNetaPct` cambio su segundo parametro de `costoVariableTotal` a `margenContribucionTotal` (ya con el indirecto incluido), para no duplicar la resta en dos lugares distintos.
- `agruparVentasPorMes` (la grafica de tendencia del Dashboard) tambien se corrigio para incluir consumo indirecto en el costo de cada mes.
- `app/page.tsx` ahora obtiene Consumo Indirecto (antes no lo pedía) y lo pasa a las tres funciones.

**Verificado en navegador**: tras el fix, "Margen de contribucion" del Dashboard ($56,115.75 este mes, $429,253.40 año pasado) coincide exactamente con "Utilidad bruta" de Estado de Resultados; el monto en pesos del gauge de Rentabilidad neta ($25,615.75 este mes, $63,253.40 año pasado) coincide exactamente con "Utilidad de operacion / neta". Punto de equilibrio subio de 472 a 482 platillos/mes (correcto: el margen por unidad bajo un poco al incluir el costo indirecto).

---

## 2026-09-09 — "Ver todas" en el historial de Ventas, en vez de paginación (con Claude Code)

**Cómo se descubrió**: el usuario, ensayando el flujo del pitch, registró una venta en vivo (Alambre de res, 2026-09-09, $150) y no la encontraba en la tabla de Ventas. Se confirmó contra la base de datos que sí se había guardado (id 4733, la más reciente) — el problema era de visualización, no de datos: Septiembre 2026 ya tiene 318 ventas en el demo, y `LIMITE_TABLA = 150` (ordenado descendente por fecha) solo muestra las mas recientes — como el 17 al 30 de septiembre ya suman 157 por si solas, todo lo anterior al 17 (incluida la venta nueva, del dia 9) quedaba fuera de vista. Esto no es exclusivo del pitch: a partir de ahora cualquier mes va a superar tambien las 150 filas, asi que el problema se iba a repetir siempre.

**Decisión: reemplazar el límite silencioso por un boton "Ver todas" / "Mostrar menos"**, en vez de paginación clásica. Se descartó paginación explícitamente porque en movil los controles de "pagina 1, 2, 3" son incomodos, y porque paginar hubiera hecho el problema original PEOR: para encontrar un registro especifico habria que adivinar en que pagina esta, en vez de poder usar Ctrl+F del navegador sobre la lista completa una vez expandida.

**Implementación, deliberadamente aislada y reversible** (a pedido explicito del usuario, por si no convence el cambio): un solo estado nuevo `mostrarTodas` en `app/ventas/page.tsx` (ningun otro archivo tocado), que alterna el `.slice(0, LIMITE_TABLA)` por la lista completa. Se resetea a `false` automaticamente al cambiar de periodo (para no arrastrar "ver todas" a un periodo con miles de filas, como "Todo el historial"). Revertir el cambio es tan simple como quitar ese estado y el bloque del boton, sin tocar ningun otro archivo ni logica de negocio.

**Verificado en navegador**: con "Ver todas" activo, las 318 ventas de septiembre se renderizan (confirmado por conteo de filas) y la venta de prueba (2026-09-09, Alambre de res, $150.00) aparece correctamente. "Mostrar menos" regresa a 150 filas sin errores.

---

## 2026-09-09 — El mes en curso del demo ahora llega solo hasta ayer, no hasta fin de mes (con Claude Code)

Conectado directamente con el hallazgo anterior (la venta de prueba "perdida" bajo el limite de la tabla): el usuario señaló que, para que un pitch en vivo se sienta responsivo, cualquier cosa que se registre "hoy" deberia aparecer de inmediato arriba de cualquier lista — pero el historial demo llenaba el mes en curso completo (hasta el dia 30), incluyendo "dias futuros" respecto al dia real en que se corre la demo. Eso hacia que un registro nuevo (fechado hoy) quedara escondido entre fechas mas recientes que en realidad son parte del historial pre-cargado, dando la impresion de que la app fallaba.

**Decisión**: en `seed_data.py`, el mes en curso (el ultimo de la curva de crecimiento) ahora solo genera datos hasta AYER (`hoy.day - 1`), dejando el dia de hoy completamente vacio para lo que se capture en vivo. Los meses anteriores no cambian (siguen llenando el mes completo). Afecta a Ventas, Compra de Insumos y el traspaso mensual caja-banco (los tres tienen fecha especifica dentro del mes); Gastos Fijos y Consumo Indirecto no se tocaron porque ya estaban fechados al dia 1, siempre dentro del rango disponible. Caso borde manejado: si "hoy" es el dia 1 del mes, ese mes se salta por completo (no hay "ayer" dentro de el).

Por qué: es exactamente el comportamiento que se espera de un sistema real — nadie tiene datos de "el futuro" en su propio negocio. La curva de crecimiento y el volumen total de unidades/mes no cambiaron, solo la distribucion de fechas dentro del mes.

**Verificado**: con un script de validacion antes de tocar la base real se confirmo que el total de ventas de "Este mes" se mantiene identico ($78,050.00, mismas unidades, mismo ticket) — la unica diferencia es que ahora se concentran del dia 1 al 8 en vez de repartirse hasta el 30. Ya en el navegador, se registro una venta en vivo fechada hoy (Alambre de res, $150.00) y aparecio como la primera fila de la tabla de Ventas, sin necesitar "Ver todas" ni hacer scroll — el escenario exacto que se queria para el pitch. Dashboard, Estado de Resultados y Flujo de Efectivo se revisaron de nuevo tras el cambio, sin ninguna regresion (mismos totales, cero errores de consola en pestaña limpia). Se reseteo el demo al terminar la prueba.

---

## 2026-09-09 — Revertido "el mes en curso llega solo hasta ayer" (con Claude Code)

El cambio anterior (mes en curso solo hasta ayer) resolvió el problema de visibilidad de la venta en vivo, pero introdujo uno peor: al concentrar el mismo volumen total de unidades/mes (sin prorratear) en menos días, "Ventas — Este mes" mostraba $78,050.00 —el monto objetivo pensado para el MES COMPLETO— ya alcanzado al día 8. Esto es ilógico frente a cualquier persona que haga la cuenta rápida durante el pitch (implica un ritmo de venta ~4x superior a cualquier mes del historial), y además, al no prorratear también Gastos Fijos (que se cargan completos el día 1), una alternativa de prorratear solo las ventas hubiera hecho ver "Rentabilidad neta" de "Este mes" artificialmente negativa.

Se evaluó prorratear también el volumen de ventas hacia abajo para un mes parcial (mostrando una rentabilidad negativa real, atribuible a que los costos fijos se registran de golpe mientras el ingreso apenas se acumula) y usar "Mes pasado" como vitrina principal del pitch. Se descartó: añade una historia secundaria innecesaria al pitch, y granularizar el pago de Gastos Fijos por quincena (renta/nómina/servicios pagándose en fechas distintas dentro del mes) para hacerlo más realista se consideró demasiado detalle para el MVP.

**Decisión final**: revertir por completo el cambio de "hasta ayer" — `seed_data.py` vuelve a sembrar el mes en curso completo (día 1 al último día del mes, igual que cualquier otro mes del historial), sin excepciones. Se acepta de nuevo el costo cosmético de que el demo tenga "fechas futuras" respecto al día real de la demo, a cambio de mantener el monto mensual objetivo intacto y coherente ($78,050.00 solo se alcanza con el mes completo, como en cualquier otro mes).

**Ajuste de estrategia de pitch (sin cambio de código)**: para demostrar la reacción en tiempo real de la app (agregar una venta o una compra de insumo y verla reflejarse), la fecha a capturar en vivo debe ser el ÚLTIMO día del mes en curso (ej. 30 de septiembre), no el día real de la demo. Como la tabla de Ventas ordena por fecha descendente, un registro fechado el día 30 cae naturalmente entre las primeras filas (junto con el resto de las ventas de ese mismo día), visible de inmediato sin depender de "Ver todas" — y evita que un registro fechado "hoy" (ej. día 9) se vea como un dato aislado y fuera de lugar en medio de un mes ya completamente poblado. El pitch puede quedarse dentro de "Este mes" sin necesidad de saltar a "Mes pasado".

---

## 2026-09-09 — Segundo perfil de datos demo: "Micro-changarro familiar" (con Claude Code)

**Motivación**: al mostrarle el sistema a otros compañeros del equipo, la objeción principal fue que $75,000-78,000/mes de ventas "se ve exagerado" para el tipo de negocio muy pequeño (changarros familiares, puestos de snacks) que ellos tenían en mente, y dudaban que la herramienta sirviera para ese segmento.

**Decisión de alcance respetada, no reabierta**: `CLAUDE.md` fija explícitamente "un solo negocio, sin multi-negocio" para el MVP. Se evaluó y se descartó construir multi-tenencia real (negocios guardados simultáneamente, `empresa_id` en cada tabla, selector persistente) — es un cambio transversal a casi todo el backend/frontend, alto riesgo para el tiempo restante de hackathon, y no aporta nada al objetivo real (convencer de que la mecánica de la app funciona igual de bien en pequeño). En vez de eso, se implementó un **segundo perfil de datos de ejemplo, mutuamente excluyente**: sigue existiendo una sola empresa activa en todo momento; cambiar de perfil borra y recarga los datos en tiempo real, igual que ya hacía "Restablecer datos de ejemplo" — mismo mecanismo, ahora parametrizado.

**Diseño del perfil "changarro"**: a propósito, no es solo "menos volumen" del mismo restaurante — tiene una estructura de costos distinta y realista para un negocio familiar informal:
- Sin Nómina (quienes atienden son familia, no empleados formales) y sin Renta de local (opera desde un carrito/puesto en la calle) — en su lugar, Gastos Fijos = Permiso municipal (derecho de piso, $400/mes, `no_objeto`) + Mantenimiento del carrito ($150/mes). Total $550/mes vs. $30,500/mes del restaurante.
- Catálogo de 4 productos (Chicharrón preparado, Cueritos preparados, Elote preparado, Agua fresca) — deliberadamente simple (se descartaron Esquites y Dorilocos de una primera propuesta de 6 productos, a pedido del usuario, para que el ejemplo sea más fácil de explicar al equipo).
- Medios de pago mayoritariamente en efectivo (`pct_banco = 0.20` vs. 0.65 del restaurante) y un hábito de ahorro más informal (`pct_traspaso_efectivo = 0.50` vs. 0.80) — reflejando un negocio de calle real.
- Colores de marca propios (`#EA580C` / `#7C2D12`, tonos cálidos de comida callejera) y saldo inicial mucho menor ($1,500 efectivo / $800 banco vs. $13,500/$31,500).

**Implementación**: `seed_data.py` se refactorizó para que todos los catálogos (insumos, recetas, gastos fijos, consumo indirecto, compras de insumo, volumen mensual, `pct_banco`, `pct_traspaso_efectivo`, configuración) vivan en un diccionario `PERFILES = {"restaurante": {...}, "changarro": {...}}`, y `build_demo_data(db, perfil)` seleccione de ahí — cero duplicación del motor de generación (curva de crecimiento, reparto de transacciones, traspasos). `POST /admin/reset-demo` ahora acepta `?perfil=restaurante|changarro` (default `restaurante`, usado también en el auto-seed de arranque con base vacía). En Configuración, la "Zona de datos demo" ahora tiene dos tarjetas seleccionables (Restaurante / Micro-changarro) antes del botón de restablecer.

**Verificado con script contra base de prueba antes de tocar la real**: perfil restaurante sin regresión ($78,050.00 en ventas, 32.8% rentabilidad neta, idéntico a antes del cambio). Perfil changarro: $20,750.00 en ventas, food cost 31.8% (dentro del rango sano 25-35%), margen de contribución $13,642.00, utilidad neta $13,092.00, **rentabilidad neta 63.1%** — mucho más alta que el restaurante precisamente porque casi no tiene gastos fijos formales, que es justo el punto pedagógico buscado. Confirmado también en navegador (Dashboard, Ventas con los 4 productos correctos, colores y nombre del negocio reflejados en toda la app tras el cambio de perfil). Demo dejado en perfil "restaurante" (default) al terminar la prueba.

---

## 2026-09-09 — Prueba end-to-end desde base vacía + bug encontrado y corregido en Flujo de Efectivo (con Claude Code)

**Motivación**: para responder a la duda de si la app realmente funciona "desde cero" (no solo con datos de demo curados), se hizo una prueba manual completa: se vació la base de datos por completo (insumos, recetas, ventas, gastos, configuración — todo, incluida la fila de `ConfiguracionNegocio`), y se recorrió el flujo real de un usuario nuevo directamente en el navegador: configurar el negocio ("Chicharrones Doña Meche"), dar de alta 1 insumo directo (Chicharrón de cerdo) y 1 indirecto (Bolsa para llevar), crear 1 receta (Chicharrón preparado, $35, food cost 29.7%), registrar 2 ventas, 1 consumo indirecto, 1 gasto fijo (Permiso municipal, $400) y 1 compra de insumo.

**Resultado en Dashboard/Estado de Resultados**: todo se comportó correctamente incluso con datos mínimos — Rentabilidad neta salió en **-86.9% (-$243.20)**, un resultado honesto y realista (una empresa que apenas arranca no ha cubierto todavía el gasto fijo del mes), sin NaN ni errores. La gráfica de tendencia mostró un mensaje amigable ("Necesitas ventas en al menos 2 meses distintos...") en vez de romperse con un solo punto de datos. Dashboard y Estado de Resultados coincidieron exactamente ($-243.20 en ambos).

**Bug real encontrado en Flujo de Efectivo**: "Saldo estimado a la fecha" no cuadraba con "Movimiento neto del periodo" ($450.00 vs. lo esperado, $10.00 = $300 saldo inicial + $-290 movimiento neto). Causa raíz: Gastos Fijos y Consumo Indirecto se guardan con `periodo` = día 1 del mes (una simplificación intencional, no representan un día de pago específico), pero `app/flujo-efectivo/page.tsx` comparaba ese "día 1" contra el día EXACTO de `fecha_saldo_inicial` (`enVigencia`). Como el saldo inicial de esta prueba quedó fechado hoy (día 9, el default del formulario), y "día 1" < "día 9", el gasto fijo y el consumo indirecto de ese mes quedaban excluidos del saldo acumulado — aunque sí se contaban correctamente en "Movimiento neto del periodo" (que compara por mes completo). Nunca se detectó antes porque ambos perfiles de demo fijan `fecha_saldo_inicial` exactamente al día 1 de su historial (`date(2025, 1, 1)`), donde la comparación por día nunca fallaba.

**Corrección**: se separó la comparación en dos funciones — `enVigencia` (por día exacto, para Ventas, Compras y Traspasos, que sí tienen una fecha real de transacción) y `enVigenciaMensual` (por mes, comparando solo `YYYY-MM`, para Gastos Fijos y Consumo Indirecto). Esto es consistente con que esos dos conceptos ya se tratan como mensuales en el resto de la app.

**Verificado**: con el fix, "Saldo estimado a la fecha" de la prueba desde cero pasó a $10.00 (=$300 + -$290, correcto). Se confirmó también que el perfil restaurante no tuvo regresión ($44,340.00 efectivo / $359,547.50 banco, identico a antes). Este bug habría afectado a cualquier negocio real que configure su saldo inicial en un día que no sea el 1 del mes — es decir, casi cualquier negocio nuevo usando la app por primera vez — así que es un hallazgo importante que la prueba desde cero logró exponer, algo que las validaciones anteriores (todas sobre datos de demo con saldo inicial fechado al día 1) no habían detectado.

---

## 2026-09-09 — Tercer perfil de demo "Un solo producto" + corrección de identidad del chicharrón + bug de compra por pieza (con Claude Code)

**Tercer perfil agregado**: a partir de la prueba manual "desde cero" (ver entrada anterior), se convirtió "Chicharrones Dona Meche" en un tercer perfil de datos de ejemplo permanente en `seed_data.py` — el caso mas extremo posible (1 receta, 1 insumo directo), con historial completo (curva de crecimiento de 21 meses, igual que los otros dos perfiles) para demostrar que la app da resultados igual de completos y correctos con un catalogo minimo que con uno grande. Se agregó como tercera tarjeta seleccionable en Configuracion, junto a Restaurante y Micro-changarro.

**Bug encontrado y corregido — factor de conversion de unidad de compra hardcodeado**: el generador de "Compra de insumos" (`build_demo_data`) calculaba `precio_compra = cantidad * 1000 * costo_por_unidad_base`, asumiendo que siempre se compra por kilogramo (factor 1000 g/kg). Esto nunca fallo antes porque los unicos insumos con compras sembradas (Carne de res, Pechuga de pollo, Cuero de cerdo) se compran por kg — pero al intentar sembrar una compra de un insumo por PIEZA (factor 1, no 1000) para el perfil de un producto, el precio salia 1000 veces mayor al real. Se corrigio agregando un diccionario `FACTOR_UNIDAD_COMPRA` (espejo de `UNIDADES_COMPRA` en el frontend) y usando el factor correcto segun la unidad de cada compra, en vez del 1000 fijo.

**Corrección de identidad del producto (a peticion del usuario)**: el catalogo original modelaba el "Chicharron preparado" con el insumo "Chicharron de cerdo" (cuerito de cerdo frito, vendido por peso, ~$0.13/g) a un precio de $35 — pero el chicharron que el usuario tenia en mente es el de HARINA (el disco grande que se infla al freirse, se vende en bolsa individual con limon/salsa/chile, precio callejero real de $15-20). Son dos platillos e insumos distintos. Esto se detecto porque el ticket promedio resultante ($109.90) le parecio al usuario sospechosamente alto para un changarro de chicharrones. Se corrigio en AMBOS perfiles que usan esta receta (changarro y un_producto): nuevo insumo "Chicharron de harina (crudo)" (magnitud pieza, se compra ya crudo por pieza, no por peso, $4.50/pieza), precio de venta bajado a $18, y la compra de insumo correspondiente ajustada a piezas en vez de kg. Resultado: ticket promedio del perfil "un producto" bajo de $109.90 a $52.66 — mucho mas creible.

**Aceite de freir modelado como insumo indirecto, no directo (a peticion del usuario)**: el usuario señaló correctamente que el aceite no se puede medir "por chicharron individual" de forma practica — una misma tanda de aceite sirve para freir muchas piezas antes de cambiarse. Se agregó "Aceite para freir" (volumen, indirecto, $0.035/ml) como nuevo insumo en ambos perfiles (changarro y un_producto), capturado vía Consumo Indirecto como un monto mensual de referencia (igual que ya se hace con el Gas), NO como ingrediente de la receta con una cantidad exacta por pieza — consistente con la regla de negocio ya fijada de que los insumos indirectos nunca tienen receta propia.

**Verificado con script contra base de prueba antes de tocar la real, en cada paso de esta secuencia de correcciones.** Cifras finales del mes actual, sin regresión en el perfil restaurante ($78,050.00, 32.8% rentabilidad, sin cambio):
- **Changarro** (Snacks La Esquina): $17,010.00 en ventas (bajo de $20,750 al corregir el precio del chicharron), food cost 31.2%, consumo indirecto $650.00 (incluye $150 de aceite), gastos fijos $550.00, rentabilidad neta 61.7%.
- **Un producto** (Chicharrones Dona Meche): $19,800.00 en ventas, food cost 25.0%, consumo indirecto $1,000.00 (incluye $700 de aceite), gastos fijos $550.00, margen $13,850.00, utilidad neta $13,300.00, **rentabilidad neta 67.2%**, ticket promedio $52.66. Confirmado en navegador: Compra de insumos muestra "1100 pieza — $4,950.00" (antes habria mostrado $4,950,000.00 por el bug del factor 1000), y Consumo Indirecto muestra "Bolsa para llevar $300.00" + "Aceite para freir $700.00" por separado.

---

## 2026-09-09 — Eliminado el perfil "Micro-changarro" (con Claude Code)

A criterio del usuario, tres perfiles de demo eran redundantes: el Restaurante (negocio completo, multi-producto) y el de Un solo producto (el caso extremo minimalista) cubren los dos extremos que valia la pena mostrarle al equipo — el Micro-changarro (Snacks La Esquina, 4 productos) quedaba en medio sin aportar un punto distinto.

**Eliminado por completo**: todas las constantes `*_CHANGARRO` de `seed_data.py` (insumos, recetas, gastos fijos, consumo indirecto, compras, unidades base, configuracion) y su entrada en `PERFILES`; el tipo de `perfil` en `api.ts` volvio a `"restaurante" | "un_producto"`; la tercera tarjeta "Micro-changarro" se quito de la Zona de datos demo en Configuracion. Quedan solo dos perfiles seleccionables: Restaurante y Un solo producto.

**Verificado**: `PERFILES` carga con exactamente `["restaurante", "un_producto"]`; busqueda de "changarro" en todo el repo (`.py`, `.ts`, `.tsx`) sin resultados; confirmado en navegador que la tarjeta ya no aparece y "Un solo producto" sigue funcionando. Demo dejado en perfil "restaurante" (default, auto-sembrado al iniciar con base vacia).

---

## 2026-09-09 — Despliegue en línea: backend en Render, frontend convertido a sitio estático en Render (con Claude Code)

**Motivación**: el usuario necesitaba que el equipo pudiera probar la app en línea. Primer intento del backend en Render fallo por incompatibilidad de `SQLAlchemy 2.0.36` con Python 3.14 (version que Render usa por defecto) al leer anotaciones `date | None` — corregido fijando `PYTHON_VERSION=3.12.10` en `render.yaml` (la misma version usada en desarrollo local). Verificado en producción: `/health` responde 200 y los datos de ejemplo del restaurante se sembraron solos en la base Postgres real al primer arranque.

**Decisión de hosting del frontend**: se evaluó Vercel (cero cambios de codigo, soporte nativo de rutas dinamicas de Next.js) contra desplegar tambien el frontend en Render. Se descarto la preocupacion inicial de "cold start" del frontend en Render porque esta app no usa ninguna funcion de servidor de Next.js (sin rutas de API propias, todo el fetching es del lado del cliente hacia el backend de FastAPI) — eso permite compilarla como sitio 100% estatico (`output: "export"` en `next.config.ts`), y los sitios estaticos de Render se sirven al instante desde su CDN, sin dormir nunca (a diferencia de los "Web Services" gratuitos, que si duermen tras 15 min).

**Bloqueo real encontrado y resuelto**: 3 paginas usaban rutas dinamicas de Next.js (`/insumos/[id]/ver`, `/recetas/[id]`, `/recetas/[id]/ver`), incompatibles con exportacion estatica porque esta necesita conocer de antemano, al compilar, todos los IDs posibles — y los IDs de insumos/recetas se crean dinamicamente despues del despliegue. Se resolvieron reescribiendo esas 3 rutas para usar un parametro de query (`?id=`) en vez de un segmento de ruta (`/[id]/`):
- `/insumos/[id]/ver` → `/insumos/ver?id=`
- `/recetas/[id]/ver` → `/recetas/ver?id=`
- `/recetas/[id]` (manejaba tanto "nueva" como edicion) → separado en `/recetas/nueva` (pagina propia, sin id) y `/recetas/editar?id=` — la logica compartida de ambas se extrajo a `components/RecetaBuilder.tsx` para no duplicar codigo.

Cada pagina que ahora lee `?id=` via `useSearchParams()` esta envuelta en un `<Suspense>` (requisito de Next.js para exportacion estatica). Se actualizaron todos los links (`RowActions`, tablas de Insumos/Recetas) a las nuevas URLs. Antes de tocar codigo se hizo un respaldo completo (tag de git `v1-estable-antes-de-rutas-query` + copia fisica de la carpeta del proyecto), a peticion explicita del usuario, dado que este cambio si modifica codigo de produccion (a diferencia de la opcion Vercel, que no hubiera requerido ningun cambio).

**Verificado**: `npm run build` genera las 20 rutas como estaticas (`○ Static`), sin ninguna ruta dinamica pendiente; confirmado en navegador local (`npm run dev`, sin afectacion) que Ver Insumo, Ver Receta, Editar Receta y Nueva Receta funcionan igual que antes, solo con URLs distintas. `render.yaml` se extendio con un segundo servicio (`runtime: static`, `staticPublishPath: ./out`) para el frontend, con `NEXT_PUBLIC_API_URL` apuntando al backend — Render aprovisiona los tres (base de datos, backend, frontend) en un solo Blueprint.

---

*Agregar nuevas entradas debajo de esta línea conforme avance el desarrollo.*
