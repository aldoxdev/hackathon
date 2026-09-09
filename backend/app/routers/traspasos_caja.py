from app.models import TraspasoCaja
from app.routers._crud import build_crud_router
from app.schemas.traspaso_caja import TraspasoCajaCreate, TraspasoCajaRead

router = build_crud_router(
    model=TraspasoCaja,
    create_schema=TraspasoCajaCreate,
    read_schema=TraspasoCajaRead,
    prefix="/traspasos-caja",
    tags=["Traspasos caja-banco"],
)
