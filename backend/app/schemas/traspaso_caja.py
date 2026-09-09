from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import DireccionTraspaso


class TraspasoCajaBase(BaseModel):
    fecha: date
    monto: float
    direccion: DireccionTraspaso
    nota: str | None = None


class TraspasoCajaCreate(TraspasoCajaBase):
    pass


class TraspasoCajaRead(TraspasoCajaBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
