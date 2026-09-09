from datetime import date

from pydantic import BaseModel, ConfigDict


class ConfiguracionNegocioBase(BaseModel):
    nombre_negocio: str
    eslogan: str | None = None
    logo_url: str | None = None
    color_primario: str
    color_secundario: str
    saldo_inicial_efectivo: float = 0
    saldo_inicial_banco: float = 0
    fecha_saldo_inicial: date


class ConfiguracionNegocioUpdate(ConfiguracionNegocioBase):
    pass


class ConfiguracionNegocioRead(ConfiguracionNegocioBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
