from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecetaInsumo(Base):
    __tablename__ = "receta_insumos"

    id: Mapped[int] = mapped_column(primary_key=True)
    receta_id: Mapped[int] = mapped_column(ForeignKey("recetas.id"))
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    cantidad_usada: Mapped[float] = mapped_column(Numeric(12, 4))

    receta: Mapped["Receta"] = relationship(back_populates="insumos")
    insumo: Mapped["Insumo"] = relationship(back_populates="receta_insumos")
