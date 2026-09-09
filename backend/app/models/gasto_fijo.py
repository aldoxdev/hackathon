from datetime import date

from sqlalchemy import Date, Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import MedioPago, TasaIva


class GastoFijo(Base):
    __tablename__ = "gastos_fijos"

    id: Mapped[int] = mapped_column(primary_key=True)
    concepto: Mapped[str] = mapped_column(String(150))
    periodo: Mapped[date] = mapped_column(Date)  # primer dia del mes al que pertenece este gasto
    monto_mensual: Mapped[float] = mapped_column(Numeric(12, 2))
    categoria: Mapped[str] = mapped_column(String(100))
    medio_pago: Mapped[MedioPago] = mapped_column(Enum(MedioPago, native_enum=False))
    tratamiento_fiscal: Mapped[TasaIva] = mapped_column(Enum(TasaIva, native_enum=False))
