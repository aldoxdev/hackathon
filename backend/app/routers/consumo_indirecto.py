from app.models import ConsumoIndirecto
from app.routers._crud import build_crud_router
from app.schemas.consumo_indirecto import ConsumoIndirectoCreate, ConsumoIndirectoRead

router = build_crud_router(
    model=ConsumoIndirecto,
    create_schema=ConsumoIndirectoCreate,
    read_schema=ConsumoIndirectoRead,
    prefix="/consumo-indirecto",
    tags=["Consumo indirecto"],
)
