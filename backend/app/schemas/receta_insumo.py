from pydantic import BaseModel, ConfigDict


class RecetaInsumoBase(BaseModel):
    receta_id: int
    insumo_id: int
    cantidad_usada: float


class RecetaInsumoCreate(RecetaInsumoBase):
    pass


class RecetaInsumoRead(RecetaInsumoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
