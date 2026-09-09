from pydantic import BaseModel, ConfigDict

from app.models.enums import Magnitud, TipoUsoInsumo


class InsumoBase(BaseModel):
    nombre: str
    magnitud: Magnitud
    tipo_uso: TipoUsoInsumo
    costo_por_unidad_base: float


class InsumoCreate(InsumoBase):
    pass


class InsumoRead(InsumoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
