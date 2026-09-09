from datetime import date

from sqlalchemy import Date, Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import DireccionTraspaso


class TraspasoCaja(Base):
    __tablename__ = "traspasos_caja"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[date] = mapped_column(Date)
    monto: Mapped[float] = mapped_column(Numeric(12, 2))
    direccion: Mapped[DireccionTraspaso] = mapped_column(Enum(DireccionTraspaso, native_enum=False))
    nota: Mapped[str | None] = mapped_column(String(200), default=None)
