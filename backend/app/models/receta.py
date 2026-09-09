from sqlalchemy import Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import OrigenReceta, TasaIva


class Receta(Base):
    __tablename__ = "recetas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    precio_venta: Mapped[float] = mapped_column(Numeric(12, 2))
    tasa_iva: Mapped[TasaIva] = mapped_column(Enum(TasaIva, native_enum=False))
    origen: Mapped[OrigenReceta] = mapped_column(Enum(OrigenReceta, native_enum=False), default=OrigenReceta.manual)

    insumos: Mapped[list["RecetaInsumo"]] = relationship(back_populates="receta", cascade="all, delete-orphan")
    ventas: Mapped[list["Venta"]] = relationship(back_populates="receta")
