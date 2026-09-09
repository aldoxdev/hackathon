from sqlalchemy import Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Magnitud, TipoUsoInsumo


class Insumo(Base):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    magnitud: Mapped[Magnitud] = mapped_column(Enum(Magnitud, native_enum=False))
    tipo_uso: Mapped[TipoUsoInsumo] = mapped_column(Enum(TipoUsoInsumo, native_enum=False))
    costo_por_unidad_base: Mapped[float] = mapped_column(Numeric(12, 4))

    receta_insumos: Mapped[list["RecetaInsumo"]] = relationship(back_populates="insumo")
    consumos_indirectos: Mapped[list["ConsumoIndirecto"]] = relationship(back_populates="insumo")
