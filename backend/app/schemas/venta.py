from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import MedioPago


class VentaBase(BaseModel):
    receta_id: int
    cantidad_vendida: int
    fecha: date
    medio_pago: MedioPago
    total_venta: float
    costo_insumos_snapshot: float


class VentaCreate(VentaBase):
    pass


class VentaRead(VentaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
