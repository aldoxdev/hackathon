import calendar
import random
from datetime import date

from sqlalchemy.orm import Session

from app.models import (
    CompraInsumo,
    ConfiguracionNegocio,
    ConsumoIndirecto,
    GastoFijo,
    Insumo,
    Receta,
    RecetaInsumo,
    TraspasoCaja,
    Venta,
)

RANDOM_SEED = 42
MES_INICIO = (2025, 1)  # el historial demo arranca en enero 2025

PERFIL_DEFAULT = "taqueria"

# Factor de conversion de cada unidad de compra hacia la unidad base del insumo (g, ml o pza),
# igual que UNIDADES_COMPRA en el frontend (lib/types.ts). Antes esto estaba fijo a 1000 (solo
# funcionaba para "kg"); con perfiles que compran insumos por pieza (factor 1) daba un precio
# de compra 1000x mayor al real.
FACTOR_UNIDAD_COMPRA = {
    "g": 1,
    "kg": 1000,
    "ml": 1,
    "L": 1000,
    "pieza": 1,
}

# ============================================================
# Perfil: Restaurante (Sazon de Barrio)
# ============================================================

# Insumos: (nombre, magnitud, tipo_uso, costo_por_unidad_base)
INSUMOS_RESTAURANTE = [
    ("Carne de res", "masa", "directo", 0.16),
    ("Pan para hamburguesa", "pieza", "directo", 4.00),
    ("Queso amarillo", "masa", "directo", 0.12),
    ("Tortilla de maiz", "pieza", "directo", 0.80),
    ("Carne de pastor", "masa", "directo", 0.14),
    ("Papa", "masa", "directo", 0.03),
    ("Lechuga", "masa", "directo", 0.02),
    ("Jitomate", "masa", "directo", 0.025),
    ("Pechuga de pollo", "masa", "directo", 0.10),
    ("Refresco de lata", "pieza", "directo", 8.00),
    ("Servilletas", "pieza", "indirecto", 0.05),
    ("Salsas de mesa", "pieza", "indirecto", 0.30),
    ("Gas", "pieza", "indirecto", 15.00),
]

# Recetas: (nombre, precio_venta, tasa_iva, [(insumo_nombre, cantidad_usada), ...])
RECETAS_RESTAURANTE = [
    (
        "Hamburguesa clasica",
        120,
        "iva_16",
        [("Carne de res", 150), ("Pan para hamburguesa", 1), ("Queso amarillo", 30)],
    ),
    (
        "Hamburguesa con queso doble",
        145,
        "iva_16",
        [("Carne de res", 200), ("Pan para hamburguesa", 1), ("Queso amarillo", 60)],
    ),
    (
        "Tacos de pastor (orden de 3)",
        85,
        "iva_16",
        [("Carne de pastor", 180), ("Tortilla de maiz", 3)],
    ),
    (
        "Alambre de res",
        150,
        "iva_16",
        [("Carne de res", 250), ("Queso amarillo", 40), ("Jitomate", 50)],
    ),
    (
        "Ensalada de pollo",
        110,
        "iva_16",
        [("Pechuga de pollo", 120), ("Lechuga", 100), ("Jitomate", 50)],
    ),
    ("Papas a la francesa", 55, "iva_16", [("Papa", 200)]),
    ("Refresco", 30, "iva_16", [("Refresco de lata", 1)]),
    (
        "Ensalada verde",
        70,
        "iva_16",
        [("Lechuga", 200), ("Jitomate", 80), ("Queso amarillo", 50)],
    ),
]

# Gastos fijos: se repiten identicos cada mes del historial demo (no escalan con la curva de
# crecimiento, a proposito: son "fijos" por definicion). (concepto, monto, categoria, medio_pago, iva)
GASTOS_FIJOS_RESTAURANTE = [
    ("Renta del local", 9000, "Renta", "banco", "iva_16"),
    ("Nomina", 18000, "Nomina", "banco", "no_objeto"),
    ("Luz", 1500, "Servicios", "banco", "iva_16"),
    ("Agua", 600, "Servicios", "banco", "exento"),
    ("Internet", 600, "Servicios", "banco", "iva_16"),
    ("Mantenimiento", 800, "Mantenimiento", "efectivo", "iva_16"),
]

# Consumo indirecto de referencia (100% de la curva de crecimiento): (insumo_nombre, monto_gastado)
CONSUMO_INDIRECTO_RESTAURANTE = [
    ("Servilletas", 400),
    ("Salsas de mesa", 300),
    ("Gas", 450),
]

# Insumos que se restockean mensualmente vía Compra de insumos, para efectos de Flujo de
# Efectivo: (insumo_nombre, cantidad_kg_base al 100% de la curva de crecimiento, unidad_compra)
COMPRAS_INSUMO_RESTAURANTE = [
    ("Carne de res", 58, "kg"),
    ("Pechuga de pollo", 5, "kg"),
]

# Unidades vendidas al mes por receta, al 100% de la curva de crecimiento (el ultimo mes del historial).
UNIDADES_BASE_MES_RESTAURANTE = {
    "Hamburguesa clasica": 180,
    "Hamburguesa con queso doble": 90,
    "Tacos de pastor (orden de 3)": 220,
    "Alambre de res": 50,
    "Ensalada de pollo": 35,
    "Papas a la francesa": 130,
    "Refresco": 160,
    "Ensalada verde": 20,
}

CONFIGURACION_RESTAURANTE = {
    "nombre_negocio": "Sazon de Barrio",
    "eslogan": "Comida casera, cuentas claras",
    "logo_url": None,
    "color_primario": "#149968",
    "color_secundario": "#123256",
    # Colchon inicial equivalente a mes y medio de gastos fijos ($30,500 x 1.5 ≈ $45,750),
    # repartido 70/30 banco/efectivo (misma proporcion que pct_banco). Fecha = inicio del
    # historial demo, para que el saldo acumulado de Flujo de Efectivo tenga sentido.
    "saldo_inicial_banco": 31500,
    "saldo_inicial_efectivo": 13500,
    "fecha_saldo_inicial": date(2025, 1, 1),
}

# ============================================================
# Perfil: Negocio de un solo producto (Chicharrones Dona Meche)
#
# El caso mas extremo posible: una sola receta, un solo insumo directo, dos insumos
# indirectos. Existe para demostrar que la app da resultados igual de completos y correctos
# (food cost %, margen, punto de equilibrio, rentabilidad neta) con un catalogo minimo que
# con uno grande — la mecanica no cambia por tener menos productos.
# ============================================================

# Chicharron de HARINA (el disco que se infla al freirse, se vende en bolsa con limon/salsa,
# $15-20 en la calle) — no confundir con el cuerito de cerdo frito, que es un platillo distinto.
# Se compra ya crudo por pieza (bolsas de piezas sin freir), no por peso.
INSUMOS_UN_PRODUCTO = [
    ("Chicharron de harina (crudo)", "pieza", "directo", 4.50),
    ("Bolsa para llevar", "pieza", "indirecto", 0.50),
    # El aceite se comparte entre muchas piezas por tanda de freido, no se puede medir "por
    # chicharron" de forma practica — va como indirecto, no como ingrediente de la receta.
    ("Aceite para freir", "volumen", "indirecto", 0.035),
]

RECETAS_UN_PRODUCTO = [
    (
        "Chicharron preparado",
        18,
        "iva_16",
        [("Chicharron de harina (crudo)", 1)],
    ),
]

GASTOS_FIJOS_UN_PRODUCTO = [
    ("Permiso municipal (derecho de piso)", 400, "Permisos", "efectivo", "no_objeto"),
    ("Mantenimiento del carrito", 150, "Mantenimiento", "efectivo", "iva_16"),
]

CONSUMO_INDIRECTO_UN_PRODUCTO = [
    ("Bolsa para llevar", 300),
    ("Aceite para freir", 700),
]

COMPRAS_INSUMO_UN_PRODUCTO = [
    ("Chicharron de harina (crudo)", 1100, "pieza"),
]

UNIDADES_BASE_MES_UN_PRODUCTO = {
    "Chicharron preparado": 1100,
}

CONFIGURACION_UN_PRODUCTO = {
    "nombre_negocio": "Chicharrones Dona Meche",
    "eslogan": "Chicharron recien hecho, al gusto",
    "logo_url": None,
    "color_primario": "#CA8A04",
    "color_secundario": "#78350F",
    "saldo_inicial_banco": 0,
    "saldo_inicial_efectivo": 300,
    "fecha_saldo_inicial": date(2025, 1, 1),
}

# ============================================================
# Perfil: Taqueria (Taqueria Los Compadres)
#
# El perfil "flagship" del equipo para este hackathon. Menu clasico de taqueria mexicana,
# con variedad real de estructuras de costo: 4 proteinas a distintos precios, gringas (agregan
# tortilla de harina y queso), un alambre completo (con tocino y pimiento), queso fundido,
# papas y una bebida — para tener el mismo tipo de variedad que ya tenia el restaurante.
# ============================================================

INSUMOS_TAQUERIA = [
    ("Carne al pastor", "masa", "directo", 0.11),
    ("Bistec de res", "masa", "directo", 0.14),
    ("Arrachera", "masa", "directo", 0.22),
    ("Chuleta de cerdo", "masa", "directo", 0.09),
    ("Tortilla de maiz", "pieza", "directo", 0.80),
    ("Tortilla de harina", "pieza", "directo", 1.20),
    ("Queso", "masa", "directo", 0.13),
    ("Chorizo", "masa", "directo", 0.09),
    ("Tocino", "masa", "directo", 0.11),
    ("Pimiento", "masa", "directo", 0.04),
    ("Papa", "masa", "directo", 0.03),
    ("Refresco de lata", "pieza", "directo", 8.00),
    # La cebolla (y el cilantro, la salsa) se sirven "al gusto" en la mesa y en los tacos por
    # igual, en cualquier platillo del menu, sin que el precio cambie si se piden con o sin
    # ellos — por eso van indirectos, compartidos entre TODO el menu, no como ingrediente
    # medido de ninguna receta especifica (ni siquiera del alambre o las papas).
    ("Cebolla", "masa", "indirecto", 0.02),
    ("Cilantro", "masa", "indirecto", 0.04),
    ("Salsa", "volumen", "indirecto", 0.04),
    ("Servilletas", "pieza", "indirecto", 0.05),
    ("Gas", "pieza", "indirecto", 15.00),
]

RECETAS_TAQUERIA = [
    ("Taco al pastor", 20, "iva_16", [("Carne al pastor", 60), ("Tortilla de maiz", 1)]),
    ("Taco de bistec", 22, "iva_16", [("Bistec de res", 60), ("Tortilla de maiz", 1)]),
    ("Taco de arrachera", 35, "iva_16", [("Arrachera", 60), ("Tortilla de maiz", 1)]),
    ("Taco de chuleta", 20, "iva_16", [("Chuleta de cerdo", 60), ("Tortilla de maiz", 1)]),
    (
        "Gringa de pastor",
        48,
        "iva_16",
        [("Tortilla de harina", 1), ("Queso", 40), ("Carne al pastor", 60)],
    ),
    (
        "Gringa de bistec",
        50,
        "iva_16",
        [("Tortilla de harina", 1), ("Queso", 40), ("Bistec de res", 60)],
    ),
    (
        "Alambre",
        130,
        "iva_16",
        [("Bistec de res", 200), ("Tocino", 60), ("Pimiento", 50), ("Queso", 60)],
    ),
    ("Queso fundido con chorizo", 85, "iva_16", [("Queso", 150), ("Chorizo", 80)]),
    ("Papas con cebolla", 45, "iva_16", [("Papa", 250)]),
    ("Refresco", 28, "iva_16", [("Refresco de lata", 1)]),
]

GASTOS_FIJOS_TAQUERIA = [
    ("Renta del local", 6000, "Renta", "banco", "iva_16"),
    ("Nomina", 12000, "Nomina", "banco", "no_objeto"),
    ("Luz", 1200, "Servicios", "banco", "iva_16"),
    ("Agua", 500, "Servicios", "banco", "exento"),
    ("Mantenimiento", 600, "Mantenimiento", "efectivo", "iva_16"),
]

CONSUMO_INDIRECTO_TAQUERIA = [
    ("Cebolla", 300),
    ("Cilantro", 200),
    ("Salsa", 250),
    ("Servilletas", 350),
    ("Gas", 500),
]

COMPRAS_INSUMO_TAQUERIA = [
    ("Carne al pastor", 54, "kg"),
    ("Bistec de res", 46, "kg"),
]

UNIDADES_BASE_MES_TAQUERIA = {
    "Taco al pastor": 900,
    "Taco de bistec": 500,
    "Taco de arrachera": 200,
    # Volumen bajo a proposito: ya tiene el margen mas bajo del menu (13.8), asi que con pocas
    # unidades cae tambien por debajo de la mediana de popularidad -> es el unico "Perro" del
    # catalogo. Sin este platillo, ningun item combina "poco vendido" con "mal margen" a la vez.
    "Taco de chuleta": 100,
    "Gringa de pastor": 150,
    "Gringa de bistec": 120,
    "Alambre": 80,
    "Queso fundido con chorizo": 60,
    "Papas con cebolla": 200,
    # Por debajo de cada variedad de taco individual a proposito: un cliente pide varios tacos
    # (a veces de distintos sabores) pero normalmente solo una bebida, asi que no es realista que
    # el refresco compita cabeza a cabeza con el pastor por el primer lugar en unidades vendidas.
    "Refresco": 400,
}

CONFIGURACION_TAQUERIA = {
    "nombre_negocio": "Taqueria Los Compadres",
    "eslogan": "Tacos como los de tu barrio",
    "logo_url": None,
    "color_primario": "#B91C1C",
    "color_secundario": "#78350F",
    "saldo_inicial_banco": 25000,
    "saldo_inicial_efectivo": 15000,
    "fecha_saldo_inicial": date(2025, 1, 1),
}

PERFILES = {
    "restaurante": {
        "insumos": INSUMOS_RESTAURANTE,
        "recetas": RECETAS_RESTAURANTE,
        "gastos_fijos_base": GASTOS_FIJOS_RESTAURANTE,
        "consumo_indirecto_base": CONSUMO_INDIRECTO_RESTAURANTE,
        "compras_insumo_base": COMPRAS_INSUMO_RESTAURANTE,
        "unidades_base_mes": UNIDADES_BASE_MES_RESTAURANTE,
        # Proporcion aproximada de transacciones pagadas por banco.
        "pct_banco": 0.65,
        # Cada mes, el negocio deposita la mayor parte de lo que cobro en efectivo a su cuenta
        # de banco (buena practica real: no dejar el efectivo acumulandose sin trazabilidad).
        "pct_traspaso_efectivo": 0.80,
        "configuracion": CONFIGURACION_RESTAURANTE,
    },
    "un_producto": {
        "insumos": INSUMOS_UN_PRODUCTO,
        "recetas": RECETAS_UN_PRODUCTO,
        "gastos_fijos_base": GASTOS_FIJOS_UN_PRODUCTO,
        "consumo_indirecto_base": CONSUMO_INDIRECTO_UN_PRODUCTO,
        "compras_insumo_base": COMPRAS_INSUMO_UN_PRODUCTO,
        "unidades_base_mes": UNIDADES_BASE_MES_UN_PRODUCTO,
        "pct_banco": 0.20,
        "pct_traspaso_efectivo": 0.50,
        "configuracion": CONFIGURACION_UN_PRODUCTO,
    },
    "taqueria": {
        "insumos": INSUMOS_TAQUERIA,
        "recetas": RECETAS_TAQUERIA,
        "gastos_fijos_base": GASTOS_FIJOS_TAQUERIA,
        "consumo_indirecto_base": CONSUMO_INDIRECTO_TAQUERIA,
        "compras_insumo_base": COMPRAS_INSUMO_TAQUERIA,
        "unidades_base_mes": UNIDADES_BASE_MES_TAQUERIA,
        "pct_banco": 0.45,
        "pct_traspaso_efectivo": 0.70,
        "configuracion": CONFIGURACION_TAQUERIA,
    },
}


def _meses_desde(inicio: tuple[int, int], hoy: date) -> list[tuple[int, int]]:
    meses = []
    anio, mes = inicio
    while (anio, mes) <= (hoy.year, hoy.month):
        meses.append((anio, mes))
        mes += 1
        if mes > 12:
            mes = 1
            anio += 1
    return meses


def _dividir_en_transacciones(total: int, rng: random.Random, min_lote=1, max_lote=3) -> list[int]:
    lotes = []
    restante = total
    while restante > 0:
        lote = min(restante, rng.randint(min_lote, max_lote))
        lotes.append(lote)
        restante -= lote
    return lotes


def _borrar_todo(db: Session) -> None:
    db.query(Venta).delete()
    db.query(CompraInsumo).delete()
    db.query(TraspasoCaja).delete()
    db.query(RecetaInsumo).delete()
    db.query(ConsumoIndirecto).delete()
    db.query(Receta).delete()
    db.query(Insumo).delete()
    db.query(GastoFijo).delete()
    db.commit()


def build_demo_data(db: Session, perfil: str = PERFIL_DEFAULT) -> None:
    if perfil not in PERFILES:
        raise ValueError(f"Perfil de demo desconocido: {perfil!r}")
    datos = PERFILES[perfil]

    _borrar_todo(db)

    rng = random.Random(RANDOM_SEED)
    hoy = date.today()
    meses = _meses_desde(MES_INICIO, hoy)
    n_meses = len(meses)

    insumos_por_nombre: dict[str, Insumo] = {}
    for nombre, magnitud, tipo_uso, costo in datos["insumos"]:
        insumo = Insumo(nombre=nombre, magnitud=magnitud, tipo_uso=tipo_uso, costo_por_unidad_base=costo)
        db.add(insumo)
        insumos_por_nombre[nombre] = insumo
    db.flush()

    recetas_por_nombre: dict[str, Receta] = {}
    costo_unitario_por_receta: dict[str, float] = {}
    for nombre, precio_venta, tasa_iva, ingredientes in datos["recetas"]:
        receta = Receta(nombre=nombre, precio_venta=precio_venta, tasa_iva=tasa_iva, origen="manual")
        db.add(receta)
        db.flush()
        recetas_por_nombre[nombre] = receta

        costo_total = 0.0
        for insumo_nombre, cantidad in ingredientes:
            insumo = insumos_por_nombre[insumo_nombre]
            db.add(RecetaInsumo(receta_id=receta.id, insumo_id=insumo.id, cantidad_usada=cantidad))
            costo_total += cantidad * float(insumo.costo_por_unidad_base)
        costo_unitario_por_receta[nombre] = costo_total

    # Curva de crecimiento: el primer mes del historial arranca al 50% del volumen de referencia
    # y sube gradualmente hasta el 100% en el mes mas reciente, simulando un negocio que ya lleva
    # tiempo operando y ha ido creciendo (no meses identicos copiados y pegados).
    for idx, (anio, mes) in enumerate(meses):
        factor = 0.5 + 0.5 * (idx / max(n_meses - 1, 1))
        dias_disponibles = calendar.monthrange(anio, mes)[1]

        ingreso_efectivo_mes = 0.0
        for receta_nombre, unidades_base in datos["unidades_base_mes"].items():
            receta = recetas_por_nombre[receta_nombre]
            costo_unitario = costo_unitario_por_receta[receta_nombre]
            unidades_mes = max(round(unidades_base * factor), 1)
            for lote in _dividir_en_transacciones(unidades_mes, rng, min_lote=1, max_lote=5):
                dia = rng.randint(1, dias_disponibles)
                medio_pago = "banco" if rng.random() < datos["pct_banco"] else "efectivo"
                total_venta = lote * float(receta.precio_venta)
                if medio_pago == "efectivo":
                    ingreso_efectivo_mes += total_venta
                db.add(
                    Venta(
                        receta_id=receta.id,
                        cantidad_vendida=lote,
                        fecha=date(anio, mes, dia),
                        medio_pago=medio_pago,
                        total_venta=total_venta,
                        costo_insumos_snapshot=lote * costo_unitario,
                    )
                )

        for insumo_nombre, monto_base in datos["consumo_indirecto_base"]:
            insumo = insumos_por_nombre[insumo_nombre]
            medio_pago_consumo = "banco" if rng.random() < datos["pct_banco"] else "efectivo"
            db.add(
                ConsumoIndirecto(
                    insumo_id=insumo.id,
                    periodo=date(anio, mes, 1),
                    monto_gastado=round(monto_base * factor, 2),
                    medio_pago=medio_pago_consumo,
                )
            )

        for insumo_nombre, cantidad_base, unidad_compra in datos["compras_insumo_base"]:
            insumo = insumos_por_nombre[insumo_nombre]
            cantidad_compra = round(cantidad_base * factor, 1)
            factor_unidad = FACTOR_UNIDAD_COMPRA[unidad_compra]
            precio_compra = round(cantidad_compra * factor_unidad * float(insumo.costo_por_unidad_base), 2)
            dia = rng.randint(1, dias_disponibles)
            medio_pago_compra = "banco" if rng.random() < datos["pct_banco"] else "efectivo"
            db.add(
                CompraInsumo(
                    insumo_id=insumo.id,
                    fecha=date(anio, mes, dia),
                    unidad_compra=unidad_compra,
                    cantidad_comprada=cantidad_compra,
                    precio_compra=precio_compra,
                    costo_por_unidad_base=float(insumo.costo_por_unidad_base),
                    medio_pago=medio_pago_compra,
                )
            )

        for concepto, monto, categoria, medio_pago, tratamiento in datos["gastos_fijos_base"]:
            db.add(
                GastoFijo(
                    concepto=concepto,
                    periodo=date(anio, mes, 1),
                    monto_mensual=monto,
                    categoria=categoria,
                    medio_pago=medio_pago,
                    tratamiento_fiscal=tratamiento,
                )
            )

        monto_traspaso = round(ingreso_efectivo_mes * datos["pct_traspaso_efectivo"], 2)
        if monto_traspaso > 0:
            db.add(
                TraspasoCaja(
                    fecha=date(anio, mes, dias_disponibles),
                    monto=monto_traspaso,
                    direccion="caja_a_banco",
                    nota="Deposito mensual del efectivo cobrado",
                )
            )

    config = db.get(ConfiguracionNegocio, 1)
    if config is None:
        config = ConfiguracionNegocio(id=1)
        db.add(config)
    for field, value in datos["configuracion"].items():
        setattr(config, field, value)

    db.commit()
