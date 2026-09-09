from app.models import GastoFijo
from app.routers._crud import build_crud_router
from app.schemas.gasto_fijo import GastoFijoCreate, GastoFijoRead

router = build_crud_router(
    model=GastoFijo,
    create_schema=GastoFijoCreate,
    read_schema=GastoFijoRead,
    prefix="/gastos-fijos",
    tags=["Gastos fijos"],
)
