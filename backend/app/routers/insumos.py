from app.models import Insumo
from app.routers._crud import build_crud_router
from app.schemas.insumo import InsumoCreate, InsumoRead

router = build_crud_router(
    model=Insumo,
    create_schema=InsumoCreate,
    read_schema=InsumoRead,
    prefix="/insumos",
    tags=["Insumos"],
)
