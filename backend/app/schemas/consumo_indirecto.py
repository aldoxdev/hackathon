from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import MedioPago


class ConsumoIndirectoBase(BaseModel):
    insumo_id: int
    periodo: date
    monto_gastado: float
    medio_pago: MedioPago


class ConsumoIndirectoCreate(ConsumoIndirectoBase):
    pass


class ConsumoIndirectoRead(ConsumoIndirectoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
