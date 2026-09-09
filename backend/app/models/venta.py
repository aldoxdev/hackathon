from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MedioPago


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(primary_key=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"))
    cantidad_vendida: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[date] = mapped_column(Date)
    medio_pago: Mapped[MedioPago] = mapped_column(Enum(MedioPago, native_enum=False))
    total_venta: Mapped[float] = mapped_column(Numeric(12, 2))
    costo_insumos_snapshot: Mapped[float] = mapped_column(Numeric(12, 2))

    receta: Mapped["Receta"] = relationship(back_populates="ventas")
