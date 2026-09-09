from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import MedioPago, TasaIva


class GastoFijoBase(BaseModel):
    concepto: str
    periodo: date
    monto_mensual: float
    categoria: str
    medio_pago: MedioPago
    tratamiento_fiscal: TasaIva


class GastoFijoCreate(GastoFijoBase):
    pass


class GastoFijoRead(GastoFijoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
