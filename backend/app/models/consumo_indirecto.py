from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MedioPago


class ConsumoIndirecto(Base):
    __tablename__ = "consumo_indirecto"

    id: Mapped[int] = mapped_column(primary_key=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    periodo: Mapped[date] = mapped_column(Date)  # primer dia del mes, ej. 2026-09-01
    monto_gastado: Mapped[float] = mapped_column(Numeric(12, 2))
    medio_pago: Mapped[MedioPago] = mapped_column(Enum(MedioPago, native_enum=False), default=MedioPago.banco)

    insumo: Mapped["Insumo"] = relationship(back_populates="consumos_indirectos")
