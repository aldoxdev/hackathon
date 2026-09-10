from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import ConfiguracionNegocio, ConsumoIndirecto, GastoFijo, Receta, Venta

router = APIRouter(prefix="/asistente", tags=["Asistente"])


class ChatRequest(BaseModel):
    pregunta: str


class ChatResponse(BaseModel):
    respuesta: str


def _construir_contexto(db: Session) -> str:
    hoy = date.today()
    mes_actual = hoy.strftime("%Y-%m")

    config = db.get(ConfiguracionNegocio, 1)
    nombre_negocio = config.nombre_negocio if config else "el negocio"

    ventas = db.query(Venta).filter(Venta.fecha.like(f"{mes_actual}%")).all()
    ventas_totales = sum(float(v.total_venta) for v in ventas)
    costo_directo = sum(float(v.costo_insumos_snapshot) for v in ventas)
    num_ventas = len(ventas)

    consumo = db.query(ConsumoIndirecto).filter(ConsumoIndirecto.periodo == f"{mes_actual}-01").all()
    costo_indirecto = sum(float(c.monto_gastado) for c in consumo)

    gastos = db.query(GastoFijo).filter(GastoFijo.periodo == f"{mes_actual}-01").all()
    gastos_fijos_totales = sum(float(g.monto_mensual) for g in gastos)

    margen = ventas_totales - costo_directo - costo_indirecto
    utilidad_neta = margen - gastos_fijos_totales
    rentabilidad_pct = (utilidad_neta / ventas_totales * 100) if ventas_totales else 0

    # Top 3 platillos del mes por total vendido
    por_receta: dict[int, float] = {}
    for v in ventas:
        por_receta[v.receta_id] = por_receta.get(v.receta_id, 0) + float(v.total_venta)
    top_3_ids = sorted(por_receta, key=por_receta.get, reverse=True)[:3]
    recetas_por_id = {r.id: r.nombre for r in db.query(Receta).all()}
    top_3_texto = ", ".join(
        f"{recetas_por_id.get(rid, '(receta eliminada)')} (${por_receta[rid]:,.2f})" for rid in top_3_ids
    )

    return f"""Eres el asistente de "Mi Cuenta Conmigo", una app de gestion financiera para
restaurantes y negocios de comida. Ayudas al dueño de "{nombre_negocio}" a entender los datos
de SU negocio, con base UNICAMENTE en las cifras de abajo (mes actual, {mes_actual}):

- Ventas totales: ${ventas_totales:,.2f} ({num_ventas} ventas registradas)
- Costo de insumos directos: ${costo_directo:,.2f}
- Consumo de insumos indirectos: ${costo_indirecto:,.2f}
- Margen de contribucion: ${margen:,.2f}
- Gastos fijos del mes: ${gastos_fijos_totales:,.2f}
- Utilidad neta: ${utilidad_neta:,.2f}
- Rentabilidad neta: {rentabilidad_pct:.1f}%
- Platillos mas vendidos este mes: {top_3_texto or "sin ventas registradas todavia"}

Instrucciones:
- Responde en español, en lenguaje sencillo — el usuario no tiene formacion contable.
- Basate SOLO en los datos de arriba. Si te preguntan algo que esos datos no cubren, dilo
  honestamente en vez de inventar una cifra.
- No des asesoria fiscal o legal formal (ISR, RESICO, obligaciones ante el SAT); si preguntan
  por eso, aclara que queda fuera de esta version de la app.
- Se breve: 2-4 oraciones por respuesta, salvo que te pidan mas detalle.
"""


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="El asistente no esta configurado todavia (falta OPENAI_API_KEY).",
        )

    from openai import OpenAI

    contexto = _construir_contexto(db)
    client = OpenAI(api_key=settings.openai_api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": contexto},
                {"role": "user", "content": payload.pregunta},
            ],
            max_tokens=400,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo contactar al asistente: {exc}")

    respuesta = response.choices[0].message.content or ""
    return ChatResponse(respuesta=respuesta)
