from pydantic import BaseModel, ConfigDict

from app.models.enums import OrigenReceta, TasaIva


class RecetaBase(BaseModel):
    nombre: str
    precio_venta: float
    tasa_iva: TasaIva
    origen: OrigenReceta = OrigenReceta.manual


class RecetaCreate(RecetaBase):
    pass


class RecetaRead(RecetaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
