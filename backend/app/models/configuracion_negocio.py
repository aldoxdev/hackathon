from datetime import date

from sqlalchemy import Date, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConfiguracionNegocio(Base):
    __tablename__ = "configuracion_negocio"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_negocio: Mapped[str] = mapped_column(String(120), default="Mi restaurante")
    eslogan: Mapped[str | None] = mapped_column(String(200), default=None)
    logo_url: Mapped[str | None] = mapped_column(String(500), default=None)
    color_primario: Mapped[str] = mapped_column(String(7), default="#149968")
    color_secundario: Mapped[str] = mapped_column(String(7), default="#123256")
    # Punto de partida para el saldo acumulado de Flujo de Efectivo: cuanto tenia el negocio
    # en cada cuenta a la fecha indicada. Todo movimiento (venta, gasto, compra) con fecha
    # posterior a esta se suma/resta encima de este punto de partida.
    saldo_inicial_efectivo: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    saldo_inicial_banco: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    fecha_saldo_inicial: Mapped[date] = mapped_column(Date, default=date.today)
