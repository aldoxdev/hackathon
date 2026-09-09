import enum


class Magnitud(str, enum.Enum):
    masa = "masa"
    volumen = "volumen"
    pieza = "pieza"


class TipoUsoInsumo(str, enum.Enum):
    directo = "directo"
    indirecto = "indirecto"


class TasaIva(str, enum.Enum):
    iva_16 = "iva_16"
    iva_0 = "iva_0"
    exento = "exento"
    no_objeto = "no_objeto"


class OrigenReceta(str, enum.Enum):
    excel = "excel"
    manual = "manual"


class MedioPago(str, enum.Enum):
    efectivo = "efectivo"
    banco = "banco"


class DireccionTraspaso(str, enum.Enum):
    caja_a_banco = "caja_a_banco"
    banco_a_caja = "banco_a_caja"
