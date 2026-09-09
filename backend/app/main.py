from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app import models  # noqa: F401 - registra los modelos en Base.metadata
from app.models import Insumo
from app.routers import (
    admin,
    compras_insumo,
    configuracion_negocio,
    consumo_indirecto,
    gastos_fijos,
    insumos,
    receta_insumos,
    recetas,
    traspasos_caja,
    ventas,
)
from app.seed_data import build_demo_data

Base.metadata.create_all(bind=engine)

with SessionLocal() as _db:
    if _db.query(Insumo).first() is None:
        build_demo_data(_db)

app = FastAPI(title="API de gestion financiera para restaurantes")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(configuracion_negocio.router)
app.include_router(insumos.router)
app.include_router(compras_insumo.router)
app.include_router(recetas.router)
app.include_router(receta_insumos.router)
app.include_router(consumo_indirecto.router)
app.include_router(ventas.router)
app.include_router(gastos_fijos.router)
app.include_router(traspasos_caja.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
