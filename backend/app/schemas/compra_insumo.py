from datetime import date

from pydantic import BaseModel, ConfigDict

from app.models.enums import MedioPago


class CompraInsumoBase(BaseModel):
    insumo_id: int
    fecha: date
    unidad_compra: str
    cantidad_comprada: float
    precio_compra: float
    costo_por_unidad_base: float
    medio_pago: MedioPago


class CompraInsumoCreate(CompraInsumoBase):
    # No se guarda en la base de datos: solo le indica al router si esta compra debe
    # actualizar el costo de referencia vigente del insumo. Por default, si (marcado por
    # default en el formulario, coincide con el comportamiento historico de esta pantalla).
    actualizar_costo_referencia: bool = True


class CompraInsumoRead(CompraInsumoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
