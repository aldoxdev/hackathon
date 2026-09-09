from app.models import RecetaInsumo
from app.routers._crud import build_crud_router
from app.schemas.receta_insumo import RecetaInsumoCreate, RecetaInsumoRead

router = build_crud_router(
    model=RecetaInsumo,
    create_schema=RecetaInsumoCreate,
    read_schema=RecetaInsumoRead,
    prefix="/receta-insumos",
    tags=["Receta-Insumos"],
)
