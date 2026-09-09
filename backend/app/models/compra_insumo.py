from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MedioPago


class CompraInsumo(Base):
    __tablename__ = "compras_insumo"

    id: Mapped[int] = mapped_column(primary_key=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    fecha: Mapped[date] = mapped_column(Date)
    unidad_compra: Mapped[str] = mapped_column(String(20))
    cantidad_comprada: Mapped[float] = mapped_column(Numeric(12, 4))
    precio_compra: Mapped[float] = mapped_column(Numeric(12, 2))
    # costo por unidad base resultante de esta compra (precio_compra / cantidad en unidad base),
    # calculado en el frontend igual que al dar de alta un insumo directo.
    costo_por_unidad_base: Mapped[float] = mapped_column(Numeric(12, 4))
    medio_pago: Mapped[MedioPago] = mapped_column(Enum(MedioPago, native_enum=False))

    insumo: Mapped["Insumo"] = relationship()
