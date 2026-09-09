from app.models import Receta
from app.routers._crud import build_crud_router
from app.schemas.receta import RecetaCreate, RecetaRead

router = build_crud_router(
    model=Receta,
    create_schema=RecetaCreate,
    read_schema=RecetaRead,
    prefix="/recetas",
    tags=["Recetas"],
)
