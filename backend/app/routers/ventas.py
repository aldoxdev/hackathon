from app.models import Venta
from app.routers._crud import build_crud_router
from app.schemas.venta import VentaCreate, VentaRead

router = build_crud_router(
    model=Venta,
    create_schema=VentaCreate,
    read_schema=VentaRead,
    prefix="/ventas",
    tags=["Ventas"],
)
