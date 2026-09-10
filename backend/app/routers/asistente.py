import calendar
import json
import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
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
from app.models.enums import DireccionTraspaso, MedioPago, TasaIva, TipoUsoInsumo

TASA_IVA_PCT = {
    TasaIva.iva_16: 0.16,
    TasaIva.iva_0: 0.0,
    TasaIva.exento: 0.0,
    TasaIva.no_objeto: 0.0,
}
TASA_IVA_LABEL = {
    TasaIva.iva_16: "IVA 16%",
    TasaIva.iva_0: "IVA 0%",
    TasaIva.exento: "Exento",
    TasaIva.no_objeto: "No objeto de impuesto",
}

router = APIRouter(prefix="/asistente", tags=["Asistente"])


class ChatRequest(BaseModel):
    pregunta: str


class ChatResponse(BaseModel):
    respuesta: str


PERIODO_ENUM = ["mes_actual", "mes_pasado", "anio_actual", "anio_pasado", "todo"]


# ============================================================
# Resolucion de periodos (equivalente en Python a lib/periodo.ts del frontend)
#
# IMPORTANTE: filtrar columnas Date con LIKE o comparandolas contra un string (ej.
# Venta.fecha.like("2026-09%")) funciona en SQLite (tipado flexible, usado en desarrollo local)
# pero truena en PostgreSQL (usado en produccion) con "operator does not exist: date ~~ unknown"
# — Postgres no tiene LIKE para columnas de fecha real. Por eso todo aqui filtra por RANGO usando
# objetos date de verdad (>=, <=), que funciona igual en ambos motores.
# ============================================================

def _rango_periodo(periodo: str, hoy: date) -> tuple[date, date] | None:
    """(inicio, fin) inclusive para PERTENENCIA a un periodo (equivalente a fechaEnPeriodo del
    frontend) — 'este mes'/'este año' es el mes/año COMPLETO, sin acotar a hoy (igual que en el
    resto de la app: el 10 de septiembre, 'este mes' sigue siendo todo septiembre). None para
    'todo' (sin filtro)."""
    if periodo == "mes_actual":
        inicio = hoy.replace(day=1)
        ultimo_dia = calendar.monthrange(hoy.year, hoy.month)[1]
        return inicio, hoy.replace(day=ultimo_dia)
    if periodo == "mes_pasado":
        primer_dia_mes_actual = hoy.replace(day=1)
        fin = primer_dia_mes_actual - timedelta(days=1)
        return fin.replace(day=1), fin
    if periodo == "anio_actual":
        return date(hoy.year, 1, 1), date(hoy.year, 12, 31)
    if periodo == "anio_pasado":
        return date(hoy.year - 1, 1, 1), date(hoy.year - 1, 12, 31)
    if periodo == "todo":
        return None
    raise ValueError(f"Periodo desconocido: {periodo}")


def _fin_periodo(periodo: str, hoy: date) -> date:
    """Fecha de corte (inclusive) para un SALDO ACUMULADO (equivalente a finDePeriodo del
    frontend) — a diferencia de _rango_periodo, aqui 'mes_actual'/'anio_actual'/'todo' SI se
    acotan a hoy, porque no tiene sentido acumular saldo hasta una fecha futura."""
    if periodo in ("mes_actual", "anio_actual", "todo"):
        return hoy
    if periodo == "mes_pasado":
        return hoy.replace(day=1) - timedelta(days=1)
    if periodo == "anio_pasado":
        return date(hoy.year - 1, 12, 31)
    raise ValueError(f"Periodo desconocido: {periodo}")


def _venta_query(db: Session, rango: tuple[date, date] | None) -> list[Venta]:
    q = db.query(Venta)
    if rango:
        q = q.filter(Venta.fecha >= rango[0], Venta.fecha <= rango[1])
    return q.all()


def _compra_insumo_query(db: Session, rango: tuple[date, date] | None) -> list[CompraInsumo]:
    q = db.query(CompraInsumo)
    if rango:
        q = q.filter(CompraInsumo.fecha >= rango[0], CompraInsumo.fecha <= rango[1])
    return q.all()


def _gasto_fijo_query(db: Session, rango: tuple[date, date] | None) -> list[GastoFijo]:
    q = db.query(GastoFijo)
    if rango:
        q = q.filter(GastoFijo.periodo >= rango[0], GastoFijo.periodo <= rango[1])
    return q.all()


def _consumo_indirecto_query(db: Session, rango: tuple[date, date] | None) -> list[ConsumoIndirecto]:
    q = db.query(ConsumoIndirecto)
    if rango:
        q = q.filter(ConsumoIndirecto.periodo >= rango[0], ConsumoIndirecto.periodo <= rango[1])
    return q.all()


def _suma_por_medio(items, campo_monto: str, medio: MedioPago) -> float:
    return sum(float(getattr(i, campo_monto)) for i in items if i.medio_pago == medio)


# ============================================================
# Funciones que el modelo puede llamar ("tools")
# ============================================================

def tool_resumen_financiero(db: Session, periodo: str) -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)

    ventas = _venta_query(db, rango)
    ventas_totales = sum(float(v.total_venta) for v in ventas)
    costo_directo = sum(float(v.costo_insumos_snapshot) for v in ventas)
    num_ventas = len(ventas)
    unidades = sum(v.cantidad_vendida for v in ventas)

    costo_indirecto = sum(float(c.monto_gastado) for c in _consumo_indirecto_query(db, rango))
    gastos_fijos_totales = sum(float(g.monto_mensual) for g in _gasto_fijo_query(db, rango))

    margen = ventas_totales - costo_directo - costo_indirecto
    utilidad_neta = margen - gastos_fijos_totales
    rentabilidad_pct = (utilidad_neta / ventas_totales * 100) if ventas_totales else 0
    costo_alimentos_pct = (costo_directo / ventas_totales * 100) if ventas_totales else 0
    ticket_promedio = (ventas_totales / num_ventas) if num_ventas else 0
    margen_prom_unidad = (margen / unidades) if unidades else 0
    punto_equilibrio = (gastos_fijos_totales / margen_prom_unidad) if margen_prom_unidad > 0 else None
    ventas_banco = _suma_por_medio(ventas, "total_venta", MedioPago.banco)
    pct_banco = (ventas_banco / ventas_totales * 100) if ventas_totales else 0

    return {
        "periodo": periodo,
        "ventas_totales": round(ventas_totales, 2),
        "numero_ventas": num_ventas,
        "costo_insumos_directos": round(costo_directo, 2),
        "costo_insumos_indirectos": round(costo_indirecto, 2),
        "costo_alimentos_pct": round(costo_alimentos_pct, 1),
        "margen_contribucion": round(margen, 2),
        "gastos_fijos": round(gastos_fijos_totales, 2),
        "utilidad_neta": round(utilidad_neta, 2),
        "rentabilidad_neta_pct": round(rentabilidad_pct, 1),
        "punto_equilibrio_platillos_mes": round(punto_equilibrio) if punto_equilibrio else None,
        "ticket_promedio": round(ticket_promedio, 2),
        "pct_ventas_por_banco": round(pct_banco, 1),
    }


def tool_top_platillos(db: Session, periodo: str, cantidad: int = 5, criterio: str = "ventas_totales") -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)
    ventas = _venta_query(db, rango)
    recetas = {r.id: r for r in db.query(Receta).all()}

    acumulado: dict[int, dict] = {}
    for v in ventas:
        d = acumulado.setdefault(v.receta_id, {"ventas_totales": 0.0, "unidades": 0, "costo_total": 0.0})
        d["ventas_totales"] += float(v.total_venta)
        d["unidades"] += v.cantidad_vendida
        d["costo_total"] += float(v.costo_insumos_snapshot)

    filas = []
    for receta_id, d in acumulado.items():
        margen = d["ventas_totales"] - d["costo_total"]
        margen_por_unidad = margen / d["unidades"] if d["unidades"] else 0
        filas.append(
            {
                "receta": recetas[receta_id].nombre if receta_id in recetas else "(receta eliminada)",
                "ventas_totales": round(d["ventas_totales"], 2),
                "unidades_vendidas": d["unidades"],
                "margen_por_unidad": round(margen_por_unidad, 2),
            }
        )

    clave = {
        "ventas_totales": "ventas_totales",
        "unidades": "unidades_vendidas",
        "margen_por_unidad": "margen_por_unidad",
    }.get(criterio, "ventas_totales")
    filas.sort(key=lambda f: f[clave], reverse=True)
    return {"periodo": periodo, "criterio": criterio, "platillos": filas[:cantidad]}


def tool_analisis_abc(db: Session, periodo: str) -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)
    ventas = _venta_query(db, rango)
    recetas = {r.id: r for r in db.query(Receta).all()}

    acumulado: dict[int, dict] = {}
    for v in ventas:
        d = acumulado.setdefault(v.receta_id, {"unidades": 0, "margen_total": 0.0})
        d["unidades"] += v.cantidad_vendida
        d["margen_total"] += float(v.total_venta) - float(v.costo_insumos_snapshot)

    if not acumulado:
        return {"periodo": periodo, "platillos": []}

    filas = []
    for receta_id, d in acumulado.items():
        margen_unidad = d["margen_total"] / d["unidades"] if d["unidades"] else 0
        filas.append(
            {
                "nombre": recetas[receta_id].nombre if receta_id in recetas else "(receta eliminada)",
                "unidades": d["unidades"],
                "margen_por_unidad": margen_unidad,
            }
        )

    unidades_ordenadas = sorted(f["unidades"] for f in filas)
    margenes_ordenados = sorted(f["margen_por_unidad"] for f in filas)
    mediana_unidades = unidades_ordenadas[len(unidades_ordenadas) // 2]
    mediana_margen = margenes_ordenados[len(margenes_ordenados) // 2]

    resultado = []
    for f in filas:
        popular = f["unidades"] >= mediana_unidades
        buen_margen = f["margen_por_unidad"] >= mediana_margen
        if popular and buen_margen:
            categoria = "Estrella"
        elif popular and not buen_margen:
            categoria = "Caballo de batalla"
        elif not popular and buen_margen:
            categoria = "Enigma"
        else:
            categoria = "Perro"
        resultado.append(
            {
                "nombre": f["nombre"],
                "unidades_vendidas": f["unidades"],
                "margen_por_unidad": round(f["margen_por_unidad"], 2),
                "categoria": categoria,
            }
        )

    return {"periodo": periodo, "platillos": resultado}


def tool_detalle_receta(db: Session, nombre: str) -> dict:
    receta = db.query(Receta).filter(Receta.nombre.ilike(f"%{nombre}%")).first()
    if not receta:
        return {"error": f"No encontre ninguna receta que coincida con '{nombre}'."}

    filas = db.query(RecetaInsumo).filter(RecetaInsumo.receta_id == receta.id).all()
    insumos = {i.id: i for i in db.query(Insumo).all()}
    detalle = []
    costo_total = 0.0
    for f in filas:
        insumo = insumos.get(f.insumo_id)
        subtotal = float(f.cantidad_usada) * float(insumo.costo_por_unidad_base) if insumo else 0
        costo_total += subtotal
        detalle.append(
            {
                "insumo": insumo.nombre if insumo else "(insumo eliminado)",
                "cantidad_usada": float(f.cantidad_usada),
                "subtotal": round(subtotal, 2),
            }
        )

    precio = float(receta.precio_venta)
    costo_alimentos_pct = (costo_total / precio * 100) if precio else 0
    tasa_pct = TASA_IVA_PCT[receta.tasa_iva]
    precio_sin_iva = precio / (1 + tasa_pct)
    return {
        "nombre": receta.nombre,
        "precio_venta": precio,
        "tasa_iva": TASA_IVA_LABEL[receta.tasa_iva],
        "precio_sin_iva": round(precio_sin_iva, 2),
        "monto_iva_incluido": round(precio - precio_sin_iva, 2),
        "costo_total_insumos": round(costo_total, 2),
        "costo_alimentos_pct": round(costo_alimentos_pct, 1),
        "insumos": detalle,
    }


def tool_flujo_efectivo(db: Session, periodo: str) -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)

    ventas = _venta_query(db, rango)
    gastos = _gasto_fijo_query(db, rango)
    consumo = _consumo_indirecto_query(db, rango)
    compras = _compra_insumo_query(db, rango)
    traspasos_q = db.query(TraspasoCaja)
    if rango:
        traspasos_q = traspasos_q.filter(TraspasoCaja.fecha >= rango[0], TraspasoCaja.fecha <= rango[1])
    traspasos = traspasos_q.all()

    ingresos_efectivo = _suma_por_medio(ventas, "total_venta", MedioPago.efectivo)
    ingresos_banco = _suma_por_medio(ventas, "total_venta", MedioPago.banco)
    egresos_efectivo = (
        _suma_por_medio(gastos, "monto_mensual", MedioPago.efectivo)
        + _suma_por_medio(consumo, "monto_gastado", MedioPago.efectivo)
        + _suma_por_medio(compras, "precio_compra", MedioPago.efectivo)
    )
    egresos_banco = (
        _suma_por_medio(gastos, "monto_mensual", MedioPago.banco)
        + _suma_por_medio(consumo, "monto_gastado", MedioPago.banco)
        + _suma_por_medio(compras, "precio_compra", MedioPago.banco)
    )
    neto_traspaso = sum(float(t.monto) for t in traspasos if t.direccion == DireccionTraspaso.caja_a_banco) - sum(
        float(t.monto) for t in traspasos if t.direccion == DireccionTraspaso.banco_a_caja
    )

    movimiento_efectivo = ingresos_efectivo - egresos_efectivo - neto_traspaso
    movimiento_banco = ingresos_banco - egresos_banco + neto_traspaso

    # Saldo estimado acumulado: desde la fecha de saldo inicial hasta el fin del periodo pedido.
    config = db.get(ConfiguracionNegocio, 1)
    fin_periodo = _fin_periodo(periodo, hoy)
    fecha_inicio_saldo = config.fecha_saldo_inicial if config else fin_periodo

    ventas_acum = db.query(Venta).filter(Venta.fecha >= fecha_inicio_saldo, Venta.fecha <= fin_periodo).all()
    compras_acum = db.query(CompraInsumo).filter(
        CompraInsumo.fecha >= fecha_inicio_saldo, CompraInsumo.fecha <= fin_periodo
    ).all()
    traspasos_acum = db.query(TraspasoCaja).filter(
        TraspasoCaja.fecha >= fecha_inicio_saldo, TraspasoCaja.fecha <= fin_periodo
    ).all()

    mes_inicio_saldo = fecha_inicio_saldo.isoformat()[:7]
    mes_fin_periodo = fin_periodo.isoformat()[:7]
    gastos_acum = [
        g for g in db.query(GastoFijo).all() if mes_inicio_saldo <= g.periodo.isoformat()[:7] <= mes_fin_periodo
    ]
    consumo_acum = [
        c for c in db.query(ConsumoIndirecto).all()
        if mes_inicio_saldo <= c.periodo.isoformat()[:7] <= mes_fin_periodo
    ]

    ingresos_efectivo_acum = _suma_por_medio(ventas_acum, "total_venta", MedioPago.efectivo)
    ingresos_banco_acum = _suma_por_medio(ventas_acum, "total_venta", MedioPago.banco)
    egresos_efectivo_acum = (
        _suma_por_medio(gastos_acum, "monto_mensual", MedioPago.efectivo)
        + _suma_por_medio(consumo_acum, "monto_gastado", MedioPago.efectivo)
        + _suma_por_medio(compras_acum, "precio_compra", MedioPago.efectivo)
    )
    egresos_banco_acum = (
        _suma_por_medio(gastos_acum, "monto_mensual", MedioPago.banco)
        + _suma_por_medio(consumo_acum, "monto_gastado", MedioPago.banco)
        + _suma_por_medio(compras_acum, "precio_compra", MedioPago.banco)
    )
    neto_traspaso_acum = sum(
        float(t.monto) for t in traspasos_acum if t.direccion == DireccionTraspaso.caja_a_banco
    ) - sum(float(t.monto) for t in traspasos_acum if t.direccion == DireccionTraspaso.banco_a_caja)

    saldo_efectivo = float(config.saldo_inicial_efectivo) + ingresos_efectivo_acum - egresos_efectivo_acum - neto_traspaso_acum
    saldo_banco = float(config.saldo_inicial_banco) + ingresos_banco_acum - egresos_banco_acum + neto_traspaso_acum

    return {
        "periodo": periodo,
        "movimiento_neto_del_periodo": {
            "efectivo": round(movimiento_efectivo, 2),
            "banco": round(movimiento_banco, 2),
            "total": round(movimiento_efectivo + movimiento_banco, 2),
        },
        "saldo_estimado_a_la_fecha": {
            "efectivo": round(saldo_efectivo, 2),
            "banco": round(saldo_banco, 2),
            "total": round(saldo_efectivo + saldo_banco, 2),
        },
    }


def tool_detalle_gastos_fijos(db: Session, periodo: str) -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)
    gastos = _gasto_fijo_query(db, rango)
    por_concepto: dict[str, float] = {}
    for g in gastos:
        por_concepto[g.concepto] = por_concepto.get(g.concepto, 0) + float(g.monto_mensual)
    filas = [{"concepto": k, "monto": round(v, 2)} for k, v in sorted(por_concepto.items(), key=lambda x: -x[1])]
    return {"periodo": periodo, "total": round(sum(f["monto"] for f in filas), 2), "conceptos": filas}


def tool_detalle_consumo_indirecto(db: Session, periodo: str) -> dict:
    hoy = date.today()
    rango = _rango_periodo(periodo, hoy)
    consumo = _consumo_indirecto_query(db, rango)
    insumos = {i.id: i.nombre for i in db.query(Insumo).all()}
    por_insumo: dict[str, float] = {}
    for c in consumo:
        nombre = insumos.get(c.insumo_id, "(insumo eliminado)")
        por_insumo[nombre] = por_insumo.get(nombre, 0) + float(c.monto_gastado)
    filas = [{"insumo": k, "monto": round(v, 2)} for k, v in sorted(por_insumo.items(), key=lambda x: -x[1])]
    return {"periodo": periodo, "total": round(sum(f["monto"] for f in filas), 2), "insumos": filas}


def tool_detalle_insumo(db: Session, nombre: str) -> dict:
    insumo = db.query(Insumo).filter(Insumo.nombre.ilike(f"%{nombre}%")).first()
    if not insumo:
        return {"error": f"No encontre ningun insumo que coincida con '{nombre}'."}

    recetas_usadas = []
    if insumo.tipo_uso == TipoUsoInsumo.directo:
        filas = db.query(RecetaInsumo).filter(RecetaInsumo.insumo_id == insumo.id).all()
        recetas = {r.id: r.nombre for r in db.query(Receta).all()}
        recetas_usadas = [
            {"receta": recetas.get(f.receta_id, "(receta eliminada)"), "cantidad_usada": float(f.cantidad_usada)}
            for f in filas
        ]

    return {
        "nombre": insumo.nombre,
        "tipo_uso": insumo.tipo_uso.value,
        "magnitud": insumo.magnitud.value,
        "costo_por_unidad_base": float(insumo.costo_por_unidad_base),
        "usado_en_recetas": recetas_usadas,
    }


def tool_costo_por_platillo(db: Session) -> dict:
    """Costo de insumos y costo de alimentos % de CADA platillo del menu, con el precio y costo
    actuales (no depende de un periodo de ventas). Ordenado de peor a mejor costo de alimentos %,
    para poder contestar directamente 'que platillo tiene el costo de alimentos mas alto' o 'cual
    cuesta mas hacer en pesos', sin que el modelo tenga que adivinar cual platillo revisar con
    detalle_receta."""
    recetas = db.query(Receta).all()
    insumos = {i.id: i for i in db.query(Insumo).all()}

    filas = []
    for receta in recetas:
        relaciones = db.query(RecetaInsumo).filter(RecetaInsumo.receta_id == receta.id).all()
        costo_total = 0.0
        for rel in relaciones:
            insumo = insumos.get(rel.insumo_id)
            if insumo:
                costo_total += float(rel.cantidad_usada) * float(insumo.costo_por_unidad_base)
        precio = float(receta.precio_venta)
        costo_alimentos_pct = (costo_total / precio * 100) if precio else 0
        filas.append(
            {
                "nombre": receta.nombre,
                "precio_venta": precio,
                "costo_total_insumos": round(costo_total, 2),
                "costo_alimentos_pct": round(costo_alimentos_pct, 1),
            }
        )

    filas.sort(key=lambda f: f["costo_alimentos_pct"], reverse=True)
    return {"platillos": filas}


# ============================================================
# Ayuda de uso de la app: contenido escrito a mano (revisando cada pantalla real), NO generado
# por el modelo. Esto le permite contestar "como hago X" o "para que sirve esta pantalla" sin
# inventar pasos que no existen de verdad en la app.
# ============================================================

AYUDA_PANTALLAS: dict[str, dict] = {
    "flujo_general": {
        "objetivo": "El orden recomendado para empezar a usar la app desde cero.",
        "pasos": [
            "1. Configura tu negocio (nombre, saldos iniciales) en Configuracion.",
            "2. Da de alta tus insumos (ingredientes) en Insumos.",
            "3. Crea tus recetas (platillos) en Recetas, usando esos insumos.",
            "4. Registra tus ventas conforme vayan pasando, en Ventas.",
            "5. Registra tus gastos fijos cada mes, en Gastos fijos.",
            "Con esto, el Resumen, el Analisis ABC, el Flujo de Efectivo y el Estado de Resultados se calculan solos, sin captura adicional.",
        ],
        "ruta": "/",
        "nombre": "Resumen",
    },
    "resumen": {
        "objetivo": "Ver de un vistazo como va tu negocio: ventas, costos, margen, punto de equilibrio y rentabilidad del periodo que elijas.",
        "pasos": [
            "Elige el periodo (este mes, mes pasado, año actual, año pasado, todo el historial) arriba a la derecha.",
            "Los indicadores se actualizan solos conforme registras ventas y gastos en las demas pantallas, no hay nada que capturar aqui.",
        ],
        "ruta": "/",
        "nombre": "Resumen",
    },
    "insumos": {
        "objetivo": "Registrar cada ingrediente que usas, para que el sistema calcule el costo de tus recetas solo.",
        "pasos": [
            "Escribe el nombre del insumo (ej. 'Carne de res').",
            "Elige la magnitud: masa, volumen o pieza — nunca se mezclan unidades distintas.",
            "Elige el tipo de uso: Directo si se mide exactamente por platillo (la carne de un taco), o Indirecto si es de uso general que no se mide por platillo (servilletas, gas, cebolla de mesa).",
            "Si es directo: indica como lo compraste (unidad de compra), el precio de compra y la cantidad comprada — el costo por unidad se calcula solo.",
            "Si es indirecto: escribe a mano el costo de referencia por unidad.",
        ],
        "ruta": "/insumos",
        "nombre": "Insumos",
    },
    "recetas": {
        "objetivo": "Armar tus platillos a partir de los insumos ya registrados, para saber el costo real y el costo de alimentos % de cada uno.",
        "pasos": [
            "Da de alta primero los insumos que usa el platillo, si todavia no existen (pantalla Insumos).",
            "En Recetas > Nueva receta, escribe el nombre del platillo, su precio de venta, y el tratamiento fiscal (IVA 16% suele aplicar a la mayoria).",
            "Agrega cada insumo que lleva el platillo uno por uno, con la cantidad que usa — el costo total y el costo de alimentos % se calculan solos conforme agregas insumos.",
        ],
        "ruta": "/recetas",
        "nombre": "Recetas",
    },
    "ventas": {
        "objetivo": "Registrar cada venta que haces, para llevar el control real de ingresos y saber que tan rentable es cada platillo.",
        "pasos": [
            "Elige la receta vendida (tiene que existir ya en Recetas), la cantidad, la fecha, y el medio de pago (efectivo o banco).",
            "El costo de insumos de esa venta se congela al momento de registrarla, aunque despues cambie el precio de los insumos, para no distorsionar el historial.",
        ],
        "ruta": "/ventas",
        "nombre": "Ventas",
    },
    "gastos_fijos": {
        "objetivo": "Capturar tus gastos que se repiten cada mes (renta, nomina, luz, etc.), para calcular tu utilidad neta real.",
        "pasos": [
            "Elige el mes, escribe el concepto (ej. 'Renta del local') y el monto mensual, y el medio de pago.",
            "Si tus gastos no cambiaron respecto al mes anterior, puedes copiarlos con un clic en vez de volver a capturarlos todos.",
        ],
        "ruta": "/gastos-fijos",
        "nombre": "Gastos fijos",
    },
    "consumo_indirecto": {
        "objetivo": "Registrar cuanto gastaste al mes en insumos de uso general que no tienen receta propia (servilletas, cebolla de mesa, gas, etc.).",
        "pasos": [
            "El insumo debe existir primero en Insumos, marcado como 'Indirecto'.",
            "Elige el insumo indirecto, escribe el monto gastado ese mes y el medio de pago.",
        ],
        "ruta": "/consumo-indirecto",
        "nombre": "Consumo indirecto",
    },
    "compras_insumos": {
        "objetivo": "Registrar cuando y cuanto pagaste realmente por tus insumos directos — alimenta el Flujo de Efectivo (es distinto del costeo de tus recetas).",
        "pasos": [
            "Elige el insumo directo comprado, la cantidad, el precio pagado, la fecha y el medio de pago.",
            "Marca 'Actualizar el costo de referencia de este insumo' si quieres que este precio se use de ahora en adelante para costear tus recetas — desmarcala si fue una compra atipica que no representa tu costo normal.",
        ],
        "ruta": "/egresos/compras-insumos",
        "nombre": "Compra de insumos",
    },
    "traspasos_caja": {
        "objetivo": "Registrar cuando mueves dinero entre tu caja (efectivo) y el banco, para que el Flujo de Efectivo refleje donde esta realmente tu dinero.",
        "pasos": ["Escribe el monto y elige la direccion: de caja a banco, o de banco a caja."],
        "ruta": "/traspasos-caja",
        "nombre": "Traspasos caja-banco",
    },
    "abc": {
        "objetivo": "Ver que platillos conviene destacar, promover, ajustar de precio o quitar del menu, cruzando popularidad contra margen.",
        "pasos": [
            "No requiere captura propia — se calcula solo a partir de tus ventas historicas, en cuanto tengas al menos 2 platillos con ventas registradas.",
            "Cada platillo cae en una de 4 categorias: Estrella, Caballo de batalla, Enigma o Perro.",
        ],
        "ruta": "/abc",
        "nombre": "Analisis ABC",
    },
    "flujo_efectivo": {
        "objetivo": "Ver cuanto dinero tienes de verdad, en efectivo y en banco — distinto de la rentabilidad, porque cuenta el dinero cuando entra o sale, no cuando se vende.",
        "pasos": [
            "No requiere captura propia — se arma solo con tus Ventas, Compras de insumos, Gastos fijos, Consumo indirecto y Traspasos entre caja y banco.",
            "Si esta cifra no coincide con tu Rentabilidad neta, normalmente es porque compraste insumos que todavia no se han vendido, o viceversa.",
        ],
        "ruta": "/flujo-efectivo",
        "nombre": "Flujo de efectivo",
    },
    "estado_resultados": {
        "objetivo": "Generar un reporte financiero formal, pensado para presentarlo ante un banco o entidad de financiamiento.",
        "pasos": ["Elige el periodo a reportar — se arma solo con lo que ya capturaste en las demas pantallas."],
        "ruta": "/estado-resultados",
        "nombre": "Estado de resultados",
    },
    "configuracion": {
        "objetivo": "Personalizar el nombre, colores y saldos iniciales de tu negocio, y reiniciar los datos de demostracion.",
        "pasos": [
            "Cambia el nombre del negocio, eslogan, logo y colores cuando quieras.",
            "Define tu saldo inicial en efectivo y en banco, y la fecha a partir de la cual se cuenta — es la base del calculo de Flujo de Efectivo.",
            "Puedes reiniciar los datos de demostracion eligiendo un perfil (restaurante, un solo producto, o taqueria).",
        ],
        "ruta": "/configuracion",
        "nombre": "Configuracion",
    },
    "glosario": {
        "objetivo": "Consultar el significado de los terminos financieros que usa la app (costo de alimentos, margen de contribucion, punto de equilibrio, etc.) en lenguaje sencillo.",
        "pasos": [],
        "ruta": "/glosario",
        "nombre": "Glosario",
    },
    "importar": {
        "objetivo": "Cargar de golpe varios insumos, recetas y ventas desde un archivo de Excel, en vez de capturarlos uno por uno.",
        "pasos": [
            "Sube un archivo .xlsx con las hojas: Insumos, Recetas, Receta_Insumos, Ventas y Gastos_Fijos.",
            "Las referencias entre hojas se resuelven por NOMBRE, no por ID — usa los mismos nombres en todas las hojas.",
            "El orden de las hojas dentro del archivo no importa, siempre se procesan en el orden correcto.",
        ],
        "ruta": "/importar",
        "nombre": "Importar Excel",
    },
}


def tool_ayuda_pantalla(pantalla: str) -> dict:
    if pantalla not in AYUDA_PANTALLAS:
        return {"error": f"No tengo ayuda para '{pantalla}'"}
    return AYUDA_PANTALLAS[pantalla]


TOOL_DISPATCH = {
    "resumen_financiero": lambda db, args: tool_resumen_financiero(db, args["periodo"]),
    "top_platillos": lambda db, args: tool_top_platillos(
        db, args["periodo"], args.get("cantidad", 5), args.get("criterio", "unidades")
    ),
    "analisis_abc": lambda db, args: tool_analisis_abc(db, args["periodo"]),
    "detalle_receta": lambda db, args: tool_detalle_receta(db, args["nombre"]),
    "flujo_efectivo": lambda db, args: tool_flujo_efectivo(db, args["periodo"]),
    "detalle_gastos_fijos": lambda db, args: tool_detalle_gastos_fijos(db, args["periodo"]),
    "detalle_consumo_indirecto": lambda db, args: tool_detalle_consumo_indirecto(db, args["periodo"]),
    "detalle_insumo": lambda db, args: tool_detalle_insumo(db, args["nombre"]),
    "costo_por_platillo": lambda db, args: tool_costo_por_platillo(db),
    "ayuda_pantalla": lambda db, args: tool_ayuda_pantalla(args["pantalla"]),
}

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "resumen_financiero",
            "description": (
                "Devuelve el resumen financiero completo de un periodo: ventas totales, costo de "
                "insumos directos e indirectos, costo de alimentos %, margen de contribucion, gastos fijos, "
                "utilidad neta, rentabilidad neta %, punto de equilibrio, ticket promedio, y % de "
                "ventas por banco. Usar para preguntas generales sobre como va el negocio, ventas, "
                "rentabilidad, margen o utilidad. Se puede llamar varias veces con periodos "
                "distintos para comparar (ej. año actual vs año pasado)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "enum": PERIODO_ENUM, "description": "El periodo a consultar."}
                },
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "top_platillos",
            "description": (
                "Devuelve el ranking de platillos de un periodo segun ventas totales, unidades "
                "vendidas, o margen por unidad. Usar para preguntas sobre cual es el platillo mas "
                "vendido o cuales son los mejores platillos. "
                "REGLA ESTRICTA sobre el criterio, no la incumplas: cuando pregunten 'cual es el "
                "producto/platillo que MAS VENDI o MAS SE VENDE', SIEMPRE usa criterio='unidades'. "
                "NUNCA uses criterio='ventas_totales' para ese tipo de pregunta, aunque el resultado "
                "cambie cual platillo sale primero. Ejemplo real: si Refresco genera $19,600 en "
                "700 unidades y Taco al pastor genera $18,000 en 900 unidades, 'el mas vendido' es "
                "Taco al pastor (mas unidades), NO Refresco, aunque Refresco haya generado mas "
                "dinero. Usa criterio='ventas_totales' UNICAMENTE si preguntan explicitamente por "
                "ingresos, dinero generado, o cual deja mas en pesos — nunca por default."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "periodo": {"type": "string", "enum": PERIODO_ENUM},
                    "cantidad": {"type": "integer", "description": "Cuantos platillos devolver (por defecto 5)."},
                    "criterio": {
                        "type": "string",
                        "enum": ["ventas_totales", "unidades", "margen_por_unidad"],
                        "description": "Por que criterio ordenar el ranking.",
                    },
                },
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analisis_abc",
            "description": (
                "Devuelve la clasificacion ABC de cada platillo (Estrella, Caballo de batalla, "
                "Enigma, Perro) segun su popularidad y margen por unidad, para un periodo. Usar "
                "para preguntas sobre que platillos destacar, cuales reconsiderar, o que hacer "
                "para mejorar la utilidad del negocio."
            ),
            "parameters": {
                "type": "object",
                "properties": {"periodo": {"type": "string", "enum": PERIODO_ENUM}},
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalle_receta",
            "description": (
                "Devuelve el detalle de costeo de una receta especifica por nombre: precio de "
                "venta, insumos usados con sus cantidades y costos, costo total, y costo de "
                "alimentos %. Usar cuando pregunten por un platillo en especifico."
            ),
            "parameters": {
                "type": "object",
                "properties": {"nombre": {"type": "string", "description": "Nombre (o parte del nombre) del platillo."}},
                "required": ["nombre"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "flujo_efectivo",
            "description": (
                "Devuelve el flujo de efectivo real de un periodo: movimiento neto (entradas menos "
                "salidas) separado en efectivo y banco, y el saldo estimado acumulado a la fecha en "
                "cada cuenta. Usar para preguntas sobre cuanto dinero tiene el negocio de verdad, o "
                "por que la rentabilidad y el flujo de efectivo no coinciden (combinar con "
                "resumen_financiero del mismo periodo)."
            ),
            "parameters": {
                "type": "object",
                "properties": {"periodo": {"type": "string", "enum": PERIODO_ENUM}},
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalle_gastos_fijos",
            "description": "Devuelve el desglose de gastos fijos por concepto (renta, nomina, servicios, etc.) para un periodo.",
            "parameters": {
                "type": "object",
                "properties": {"periodo": {"type": "string", "enum": PERIODO_ENUM}},
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalle_consumo_indirecto",
            "description": "Devuelve el desglose de consumo de insumos indirectos (servilletas, gas, etc.) por insumo, para un periodo.",
            "parameters": {
                "type": "object",
                "properties": {"periodo": {"type": "string", "enum": PERIODO_ENUM}},
                "required": ["periodo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalle_insumo",
            "description": (
                "Devuelve informacion de un insumo especifico por nombre: si es directo o "
                "indirecto, su costo por unidad, y en que recetas se usa."
            ),
            "parameters": {
                "type": "object",
                "properties": {"nombre": {"type": "string", "description": "Nombre (o parte del nombre) del insumo."}},
                "required": ["nombre"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "costo_por_platillo",
            "description": (
                "Devuelve el costo de insumos, precio de venta y costo de alimentos % de TODOS los "
                "platillos del menu, ya ordenados del costo de alimentos % mas alto al mas bajo (con el "
                "precio y costo actuales, sin depender de un periodo de ventas). Es la funcion "
                "correcta para 'que platillo tiene el costo de alimentos mas alto', 'cual me cuesta mas "
                "producir en pesos' o 'que producto deberia mejorar su costo' cuando la pregunta "
                "es sobre el costo en si (no sobre volumen de venta ni impacto total en la "
                "utilidad — para eso usa analisis_abc, que mide algo distinto: popularidad vs "
                "margen). No le pases ningun parametro."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ayuda_pantalla",
            "description": (
                "Devuelve el objetivo y los pasos reales de una pantalla de la app, para "
                "contestar preguntas de USO (no financieras) como 'como doy de alta un insumo', "
                "'como registro una venta', 'para que sirve el analisis ABC', o 'por donde "
                "empiezo/cual es el flujo para usar el sistema' (usa pantalla='flujo_general' "
                "para esta ultima). SIEMPRE llama esta funcion para preguntas de uso — nunca "
                "inventes los pasos de memoria, aunque te parezcan obvios."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pantalla": {
                        "type": "string",
                        "enum": [
                            "flujo_general",
                            "resumen",
                            "insumos",
                            "recetas",
                            "ventas",
                            "gastos_fijos",
                            "consumo_indirecto",
                            "compras_insumos",
                            "traspasos_caja",
                            "abc",
                            "flujo_efectivo",
                            "estado_resultados",
                            "configuracion",
                            "glosario",
                            "importar",
                        ],
                    }
                },
                "required": ["pantalla"],
            },
        },
    },
]

SYSTEM_PROMPT = """Eres el asistente de "Mi Cuenta Conmigo", una app de gestion financiera para
restaurantes y negocios de comida. El negocio se llama "{nombre_negocio}".

Tienes funciones para consultar los datos REALES del negocio (ventas, costos, gastos, flujo de
efectivo, recetas, insumos). SIEMPRE usa las funciones para obtener cifras antes de responder —
nunca inventes un numero. Si la pregunta requiere comparar dos periodos (ej. "este año vs el año
pasado"), llama la funcion correspondiente una vez por cada periodo.

MUY IMPORTANTE: nunca anuncies que "vas a" llamar una funcion o "un momento, voy a revisar/analizar
esto" y dejes la respuesta ahi. Eso no funciona — no hay un turno despues para completarlo. Si
necesitas datos, llama la funcion inmediatamente en el mismo turno, sin decir nada antes. Solo
escribe texto para el usuario cuando ya tengas todos los datos que necesitas y esa sea tu
respuesta final.

Si preguntan algo abierto tipo "¿como mejoro mis ganancias/ventas?" o "¿que hago para ganar mas?",
NO expliques la metodologia en abstracto ni ofrezcas "¿quieres que revise...?" — llama tu mismo
resumen_financiero y analisis_abc (y top_platillos si hace falta) del periodo mas reciente con
datos (normalmente mes_actual) y da el consejo ya aplicado a SUS platillos y SUS numeros reales
(nombrando los platillos especificos y sus cifras), no una explicacion generica de que es un
"Estrella" o un "Perro".

Para estas preguntas abiertas de "como gano mas", cubre mas de un angulo, no solo mezcla de menu
(ABC) y costo de alimentos general. Es OBLIGATORIO llamar tambien detalle_receta con el nombre del platillo
de peor margen por unidad (tipicamente un "Caballo de batalla" o "Perro") — de la respuesta de esa
funcion, identifica el insumo con el "subtotal" mas alto y menciona SU NOMBRE explicitamente,
sugiriendo revisar su precio de compra o buscar otro proveedor para ese insumo en concreto. No es
suficiente decir "mejorar el costo de insumos" en general — el consejo debe nombrar el insumo. La
meta es que la respuesta toque tanto el lado de menu/precio como el lado de costo de insumos con
ese nivel de detalle, no solo uno de los dos de forma generica.

MUY IMPORTANTE (aritmetica): cuando una funcion ya te devuelve un campo "total" (o similar, ya
sumado), usa ese valor TAL CUAL en tu respuesta — nunca vuelvas a sumar los componentes a mano
para dar un numero "final", porque ahi es donde cometes errores de calculo. Por ejemplo, en
flujo_efectivo, el numero que responde "cuanto dinero tengo" es
saldo_estimado_a_la_fecha.total (no lo recalcules sumando efectivo + banco tu mismo; usa el
campo total ya incluido). movimiento_neto_del_periodo es algo distinto (cuanto cambio en el
periodo, no cuanto hay en total) — no lo confundas con el saldo total.

Conocimiento de fondo que debes aplicar al interpretar los datos que obtengas:

- Rentabilidad neta vs Flujo de efectivo: la Rentabilidad cuenta el costo de un insumo cuando se
  VENDE (costo congelado al momento de la venta); el Flujo de Efectivo lo cuenta cuando se PAGA
  (al comprarlo). Si se compraron insumos que aun no se usan en una venta, el efectivo baja pero
  la rentabilidad no lo refleja todavia — esa es la explicacion tipica cuando estos dos numeros
  no coinciden.
- Analisis ABC: "Estrella" (se vende mucho, buen margen) -> cuidarlo y destacarlo en el menu.
  "Caballo de batalla" (se vende mucho, margen bajo) -> subir precio o bajar costo. "Enigma"
  (poco vendido, buen margen) -> promoverlo mas. "Perro" (poco vendido, margen bajo) -> considerar
  quitarlo del menu. Usa esta clasificacion cuando pregunten que hacer para mejorar la utilidad.
  IMPORTANTE: estas acciones son especificas de cada categoria, no las mezcles. Si preguntan
  especificamente que producto conviene mejorar el COSTO de insumos (no el precio, no si quitarlo
  del menu), la respuesta correcta son los "Caballo de batalla" — NUNCA un "Perro" (a un "Perro"
  le toca evaluar sacarlo del menu, no negociar su costo). Ademas, entre varios "Caballo de
  batalla", prioriza el que tenga mayor IMPACTO TOTAL (margen bajo Y muchas unidades vendidas),
  no solo el que tenga el margen por unidad mas bajo en aislado — un platillo que vende 900
  unidades al mes pesa mucho mas que uno que vende 100, aunque su margen por unidad sea parecido.
- Costo de alimentos % saludable: entre 25% y 35%. Fuera de ese rango no es necesariamente un
  error, pero vale la pena mencionarlo. Usa siempre el termino "costo de alimentos %", nunca
  "food cost" en ingles — el usuario de esta app no tiene por que conocer terminologia en ingles.
- Rentabilidad baja o negativa a principios de mes es normal: los Gastos Fijos se registran
  completos desde el dia 1, mientras que las ventas del mes apenas se acumulan.

Limites de lo que puedes responder:
- No des asesoria fiscal o legal FORMAL: declaraciones, ISR, RESICO, obligaciones ante el SAT —
  aclara que queda fuera de esta version de la app. ESTO NO INCLUYE aritmetica simple de IVA
  sobre un precio (ej. "cuanto IVA lleva mi taco", "cuanto es sin IVA") — eso SI debes
  contestarlo, usando detalle_receta (ya te regresa tasa_iva, precio_sin_iva y
  monto_iva_incluido calculados) en vez de pedirle el precio al usuario o negarte.
- No inventes como cambiarian las ventas o el comportamiento de los clientes ante hipoteticos
  (ej. "si subo el precio, ¿voy a vender menos?") — eso no lo sabes con los datos que tienes. Si
  preguntan un "que pasaria si" sobre precio o costo asumiendo el MISMO volumen de ventas, si
  puedes calcularlo (es aritmetica simple con los datos de detalle_receta y el volumen actual),
  pero deja claro que asume el mismo volumen.
- Si preguntan como usar una pantalla de la app (dar de alta un insumo, registrar una venta, por
  donde empezar, etc.), usa la funcion ayuda_pantalla — no inventes los pasos. Si preguntan algo
  de soporte tecnico que no cubre esa funcion (errores, bugs, cuenta, facturacion), dilo
  honestamente en vez de inventar.
- Responde en español, en lenguaje sencillo — el usuario no tiene formacion contable. Se breve
  (2-5 oraciones), salvo que pidan mas detalle.

Pantallas de la app (usa esta tabla para mandar al usuario a la pantalla correcta cuando su
pregunta se resuelve mejor viendola ahi con calma, ademas de tu respuesta):
- /abc — clasificacion ABC completa de platillos (Estrella/Caballo de batalla/Enigma/Perro).
- /flujo-efectivo — cuanto dinero real tiene el negocio, en efectivo y en banco.
- /traspasos-caja — registrar movimientos de dinero entre caja y banco.
- /estado-resultados — reporte formal para presentar a un banco o entidad de financiamiento.
- /recetas — dar de alta o editar un platillo y su receta.
- /insumos — dar de alta un insumo/ingrediente.
- /egresos/compras-insumos — registrar una compra de insumos.
- /gastos-fijos — capturar renta, nomina, servicios y otros gastos fijos.
- /consumo-indirecto — registrar consumo de insumos indirectos (cebolla de mesa, servilletas, gas).
- /ventas — registrar una venta.
- /configuracion — cambiar saldos iniciales o reiniciar los datos de demostracion.
- /glosario — definiciones de terminos financieros (costo de alimentos, margen, etc).
- / — panel principal con el resumen del negocio.

Cuando menciones una pantalla, usa formato de link markdown con su nombre en español, por
ejemplo: "Puedes verlo con mas detalle en [Analisis ABC](/abc)." Usa las rutas EXACTAS de arriba
TAL CUAL, empezando con "/" — nunca les pongas un dominio delante (nunca escribas
"http://algo/abc" ni "https://algo/abc"), y nunca inventes una ruta que no este en la lista.

Formato de tu respuesta: puedes usar **negritas** para resaltar numeros o nombres de platillos
clave, y listas numeradas (1. 2. 3.) o con guion (-) cuando enumeres varios puntos. Regla
importante sobre las listas, sin excepcion: CADA PUNTO DE LA LISTA CABE EN UNA SOLA LINEA. Nunca
metas un salto de linea dentro de un punto, nunca hagas sub-puntos anidados, nunca le des su
propio numero a cada dato suelto. Si vas a dar varios datos del MISMO platillo (nombre, costo,
insumo mas caro, etc.), los juntas TODOS en esa unica linea separados por coma o guion medio, asi:
"1. **Taco de bistec** - costo total de insumos $9.20, insumo mas caro: Bistec de res ($8.40)".
Un platillo = un punto = una linea, nunca mas de un punto para el mismo platillo. No uses
encabezados (#) ni tablas.
"""


# ============================================================
# Links a pantallas: en vez de depender de que el modelo se acuerde de sugerir la pantalla
# correcta en cada respuesta, esto asocia cada funcion con su pantalla de forma fija en codigo.
# Si una funcion de la lista se uso para responder y su pantalla no aparece ya en el texto, se
# agrega automaticamente al final. Esto cubre preguntas nuevas sin tener que ajustar el prompt.
# ============================================================

TOOL_A_PAGINA: dict[str, tuple[str, str]] = {
    "resumen_financiero": ("/", "Resumen"),
    "analisis_abc": ("/abc", "Analisis ABC"),
    "top_platillos": ("/abc", "Analisis ABC"),
    "flujo_efectivo": ("/flujo-efectivo", "Flujo de efectivo"),
    "detalle_receta": ("/recetas", "Recetas"),
    "detalle_gastos_fijos": ("/gastos-fijos", "Gastos fijos"),
    "detalle_consumo_indirecto": ("/consumo-indirecto", "Consumo indirecto"),
    "detalle_insumo": ("/insumos", "Insumos"),
    "costo_por_platillo": ("/recetas", "Recetas"),
}


def _quitar_dominio_de_links(texto: str) -> str:
    """El modelo a veces escribe el link con dominio completo (http://localhost:3000/abc) en vez
    de ruta relativa (/abc). El frontend solo reconoce rutas relativas, asi que se recorta el
    dominio aqui en vez de confiar en que el prompt lo evite siempre."""
    return re.sub(r"\]\(https?://[^/\s)]+(/[^)]*)?\)", lambda m: f"]({m.group(1) or '/'})", texto)


_ACENTOS_POR_LETRA = {"a": "aá", "e": "eé", "i": "ií", "o": "oó", "u": "uúü", "n": "nñ"}


def _clase_letra_insensible(c: str) -> str:
    variantes = _ACENTOS_POR_LETRA.get(c.lower(), c.lower())
    todas = sorted(set(variantes) | {v.upper() for v in variantes})
    return "[" + "".join(todas) + "]"


def _patron_pantalla(nombre: str) -> str:
    """Patron para detectar la mencion de una pantalla en texto libre. La PRIMERA letra exige
    mayuscula/minuscula EXACTA (para no enlazar un uso generico en minusculas de la palabra, ej.
    "tus insumos", en vez de la mencion real a la pantalla, ej. "en Insumos") — el resto tolera
    tanto acentos (Configuracion/Configuración) como mayusculas variables (el modelo a veces
    escribe "Flujo de Efectivo", a veces "Flujo de efectivo")."""
    partes = []
    for i, c in enumerate(nombre):
        if not c.isalpha():
            partes.append(re.escape(c))
        elif i == 0:
            partes.append(re.escape(c))
        else:
            partes.append(_clase_letra_insensible(c))
    return "".join(partes)


def _autolinkear_pantallas_mencionadas(texto: str) -> str:
    """Cuando se uso ayuda_pantalla, el texto suele mencionar OTRAS pantallas en texto plano (ej.
    "da de alta tus insumos en Insumos") sin que el modelo se acuerde de ponerles el link — a
    diferencia de _agregar_links_faltantes (que solo garantiza la pantalla que se pidio), esto
    enlaza cualquier mencion de CUALQUIER pantalla catalogada que aparezca en el texto, sea que
    el modelo la haya puesto en negritas, texto plano, o ya como link."""
    ya_presentes = set(re.findall(r"\((/[^)]*)\)", texto))
    # nombres mas largos primero, para no enlazar "Insumos" a medias dentro de "Compra de insumos"
    entradas = sorted(AYUDA_PANTALLAS.values(), key=lambda e: -len(e["nombre"]))
    for info in entradas:
        ruta, nombre = info["ruta"], info["nombre"]
        if ruta in ya_presentes or ruta == "/":  # "/" es demasiado generico para autolinkear por nombre
            continue
        patron = re.compile(rf"(?<![\[\(/-]){_patron_pantalla(nombre)}\b(?!\]|\()")
        texto, n = patron.subn(lambda m: f"[{m.group(0)}]({ruta})", texto, count=1)
        if n:
            ya_presentes.add(ruta)
    return texto


def _agregar_links_faltantes(texto: str, herramientas_usadas: set[str], pantallas_pedidas: set[str]) -> str:
    ya_presentes = set(re.findall(r"\((/[^)]*)\)", texto))
    faltantes: dict[str, str] = {}
    for nombre_tool in herramientas_usadas:
        pagina = TOOL_A_PAGINA.get(nombre_tool)
        if pagina and pagina[0] not in ya_presentes:
            faltantes[pagina[0]] = pagina[1]
    # ayuda_pantalla no tiene una sola pagina fija por herramienta (depende de que pantalla se
    # haya pedido), asi que se resuelve aparte usando la ruta real de cada pantalla consultada —
    # sin esto, los links a las pantallas mencionadas en una respuesta de ayuda son puro adorno
    # voluntario del modelo, y a veces los pone y a veces no.
    for pantalla in pantallas_pedidas:
        info = AYUDA_PANTALLAS.get(pantalla)
        if info and info["ruta"] not in ya_presentes and info["ruta"] not in faltantes:
            faltantes[info["ruta"]] = info["nombre"]
    if not faltantes:
        return texto
    links = ", ".join(f"[{nombre}]({ruta})" for ruta, nombre in faltantes.items())
    return f"{texto}\n\nPara ver mas detalle: {links}."


# ============================================================
# Correccion de cifras: el modelo a veces transcribe mal una cifra larga al redactar su respuesta
# (ej. escribe $40,583.75 en vez de $405,837.50 que SI vino en el JSON de una funcion). En vez de
# validar esto funcion por funcion, se guardan TODOS los numeros que devolvio cualquier funcion
# durante la conversacion, y al final se revisa cada monto en $ del texto: si no coincide con
# ningun numero real pero si coincide corriendo el punto decimal (x10, /10, x100, /100), se
# corrige. Esto cubre las funciones actuales y cualquier funcion nueva sin tocar el prompt.
# ============================================================

PATRON_MONTO = re.compile(r"\$\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?")


def _extraer_numeros(obj) -> set[float]:
    numeros: set[float] = set()
    if isinstance(obj, dict):
        for v in obj.values():
            numeros |= _extraer_numeros(v)
    elif isinstance(obj, list):
        for v in obj:
            numeros |= _extraer_numeros(v)
    elif isinstance(obj, (int, float)) and not isinstance(obj, bool):
        numeros.add(round(float(obj), 2))
    return numeros


def _corregir_cifras(texto: str, cifras_confiables: set[float]) -> str:
    if not cifras_confiables:
        return texto

    def reemplazar(match: re.Match) -> str:
        crudo = match.group(0)
        valor = float(crudo.replace("$", "").replace(",", ""))
        if any(abs(valor - c) < 0.005 for c in cifras_confiables):
            return crudo
        for factor in (10, 0.1, 100, 0.01):
            candidato = round(valor * factor, 2)
            if any(abs(candidato - c) < 0.005 for c in cifras_confiables):
                return f"${candidato:,.2f}"
        return crudo

    return PATRON_MONTO.sub(reemplazar, texto)


# ============================================================
# Version anterior (contexto fijo de "este mes", sin function calling). Se deja sin usar, solo
# como respaldo rapido: si algo falla con el enfoque de funciones, cambiar el endpoint de abajo
# para volver a llamar esta funcion en vez del ciclo de tools.
# ============================================================

def _construir_contexto_simple(db: Session) -> str:
    resumen = tool_resumen_financiero(db, "mes_actual")
    top = tool_top_platillos(db, "mes_actual", cantidad=3)
    config = db.get(ConfiguracionNegocio, 1)
    nombre_negocio = config.nombre_negocio if config else "el negocio"
    top_texto = ", ".join(f"{p['receta']} (${p['ventas_totales']:,.2f})" for p in top["platillos"])
    return f"""Eres el asistente de "Mi Cuenta Conmigo". Ayudas al dueño de "{nombre_negocio}" a
entender los datos de SU negocio, con base UNICAMENTE en las cifras de abajo (mes actual):

- Ventas totales: ${resumen['ventas_totales']:,.2f} ({resumen['numero_ventas']} ventas)
- Costo de insumos directos: ${resumen['costo_insumos_directos']:,.2f}
- Consumo de insumos indirectos: ${resumen['costo_insumos_indirectos']:,.2f}
- Margen de contribucion: ${resumen['margen_contribucion']:,.2f}
- Gastos fijos del mes: ${resumen['gastos_fijos']:,.2f}
- Utilidad neta: ${resumen['utilidad_neta']:,.2f}
- Rentabilidad neta: {resumen['rentabilidad_neta_pct']}%
- Platillos mas vendidos: {top_texto or "sin ventas registradas todavia"}

Responde en español, en lenguaje sencillo, breve, basandote solo en lo de arriba.
"""


# ============================================================
# Endpoint
# ============================================================

@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="El asistente no esta configurado todavia (falta OPENAI_API_KEY).",
        )

    from openai import OpenAI

    config = db.get(ConfiguracionNegocio, 1)
    nombre_negocio = config.nombre_negocio if config else "el negocio"
    system_prompt = SYSTEM_PROMPT.format(nombre_negocio=nombre_negocio)

    client = OpenAI(api_key=settings.openai_api_key)
    mensajes: list[dict] = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": payload.pregunta},
    ]

    herramientas_usadas: set[str] = set()
    cifras_confiables: set[float] = set()
    pantallas_pedidas: set[str] = set()

    try:
        for _ in range(5):  # limite de vueltas para evitar loops infinitos si el modelo insiste
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=mensajes,
                tools=TOOLS_SCHEMA,
                max_tokens=500,
            )
            mensaje = response.choices[0].message

            if not mensaje.tool_calls:
                texto = _quitar_dominio_de_links(mensaje.content or "")
                texto = _corregir_cifras(texto, cifras_confiables)
                if pantallas_pedidas:
                    texto = _autolinkear_pantallas_mencionadas(texto)
                texto = _agregar_links_faltantes(texto, herramientas_usadas, pantallas_pedidas)
                return ChatResponse(respuesta=texto)

            mensajes.append(mensaje.model_dump(exclude_unset=True))
            for tool_call in mensaje.tool_calls:
                nombre_funcion = tool_call.function.name
                herramientas_usadas.add(nombre_funcion)
                try:
                    args = json.loads(tool_call.function.arguments or "{}")
                    if nombre_funcion == "ayuda_pantalla" and "pantalla" in args:
                        pantallas_pedidas.add(args["pantalla"])
                    resultado = TOOL_DISPATCH[nombre_funcion](db, args)
                    cifras_confiables |= _extraer_numeros(resultado)
                except Exception as exc:  # noqa: BLE001 - se le regresa el error al modelo, no se rompe la app
                    resultado = {"error": str(exc)}
                mensajes.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(resultado, ensure_ascii=False),
                    }
                )

        return ChatResponse(respuesta="No pude terminar de procesar tu pregunta, intenta reformularla.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo contactar al asistente: {exc}")
