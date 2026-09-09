export type Magnitud = "masa" | "volumen" | "pieza";
export type TipoUsoInsumo = "directo" | "indirecto";

export interface Insumo {
  id: number;
  nombre: string;
  magnitud: Magnitud;
  tipo_uso: TipoUsoInsumo;
  costo_por_unidad_base: number;
}

export interface InsumoInput {
  nombre: string;
  magnitud: Magnitud;
  tipo_uso: TipoUsoInsumo;
  costo_por_unidad_base: number;
}

export const UNIDAD_BASE: Record<Magnitud, string> = {
  masa: "g",
  volumen: "ml",
  pieza: "pza",
};

export const MAGNITUD_LABEL: Record<Magnitud, string> = {
  masa: "Masa",
  volumen: "Volumen",
  pieza: "Pieza",
};

// Unidades de compra permitidas por magnitud y su factor de conversion a la unidad base.
export const UNIDADES_COMPRA: Record<Magnitud, { value: string; label: string; factor: number }[]> = {
  masa: [
    { value: "g", label: "gramos (g)", factor: 1 },
    { value: "kg", label: "kilogramos (kg)", factor: 1000 },
  ],
  volumen: [
    { value: "ml", label: "mililitros (ml)", factor: 1 },
    { value: "L", label: "litros (L)", factor: 1000 },
  ],
  pieza: [{ value: "pieza", label: "pieza", factor: 1 }],
};

export type TasaIva = "iva_16" | "iva_0" | "exento" | "no_objeto";
export type OrigenReceta = "excel" | "manual";

export const TASA_IVA_LABEL: Record<TasaIva, string> = {
  iva_16: "IVA 16%",
  iva_0: "IVA 0%",
  exento: "Exento",
  no_objeto: "No objeto de impuesto",
};

export interface Receta {
  id: number;
  nombre: string;
  precio_venta: number;
  tasa_iva: TasaIva;
  origen: OrigenReceta;
}

export interface RecetaInput {
  nombre: string;
  precio_venta: number;
  tasa_iva: TasaIva;
  origen: OrigenReceta;
}

export interface RecetaInsumo {
  id: number;
  receta_id: number;
  insumo_id: number;
  cantidad_usada: number;
}

export interface RecetaInsumoInput {
  receta_id: number;
  insumo_id: number;
  cantidad_usada: number;
}

// Costo de alimentos % saludable segun el analisis (25-35% ideal).
export function foodCostSemaforo(foodCostPct: number): "verde" | "amarillo" | "rojo" {
  if (foodCostPct >= 25 && foodCostPct <= 35) return "verde";
  if (foodCostPct >= 15 && foodCostPct <= 45) return "amarillo";
  return "rojo";
}

export type MedioPago = "efectivo" | "banco";

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  banco: "Banco",
};

export interface Venta {
  id: number;
  receta_id: number;
  cantidad_vendida: number;
  fecha: string; // YYYY-MM-DD
  medio_pago: MedioPago;
  total_venta: number;
  costo_insumos_snapshot: number;
}

export interface VentaInput {
  receta_id: number;
  cantidad_vendida: number;
  fecha: string;
  medio_pago: MedioPago;
  total_venta: number;
  costo_insumos_snapshot: number;
}

export interface GastoFijo {
  id: number;
  concepto: string;
  periodo: string; // YYYY-MM-DD, siempre dia 1 del mes al que pertenece este gasto
  monto_mensual: number;
  categoria: string;
  medio_pago: MedioPago;
  tratamiento_fiscal: TasaIva;
}

export interface GastoFijoInput {
  concepto: string;
  periodo: string;
  monto_mensual: number;
  categoria: string;
  medio_pago: MedioPago;
  tratamiento_fiscal: TasaIva;
}

export interface ConfiguracionNegocio {
  id: number;
  nombre_negocio: string;
  eslogan: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  saldo_inicial_efectivo: number;
  saldo_inicial_banco: number;
  fecha_saldo_inicial: string; // YYYY-MM-DD
}

export interface ConfiguracionNegocioInput {
  nombre_negocio: string;
  eslogan: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  saldo_inicial_efectivo: number;
  saldo_inicial_banco: number;
  fecha_saldo_inicial: string;
}

export interface ConsumoIndirecto {
  id: number;
  insumo_id: number;
  periodo: string; // YYYY-MM-DD, siempre dia 1 del mes
  monto_gastado: number;
  medio_pago: MedioPago;
}

export interface ConsumoIndirectoInput {
  insumo_id: number;
  periodo: string;
  monto_gastado: number;
  medio_pago: MedioPago;
}

export type DireccionTraspaso = "caja_a_banco" | "banco_a_caja";

export const DIRECCION_TRASPASO_LABEL: Record<DireccionTraspaso, string> = {
  caja_a_banco: "De caja a banco",
  banco_a_caja: "De banco a caja",
};

export interface TraspasoCaja {
  id: number;
  fecha: string; // YYYY-MM-DD
  monto: number;
  direccion: DireccionTraspaso;
  nota: string | null;
}

export interface TraspasoCajaInput {
  fecha: string;
  monto: number;
  direccion: DireccionTraspaso;
  nota: string | null;
}

export interface CompraInsumo {
  id: number;
  insumo_id: number;
  fecha: string; // YYYY-MM-DD
  unidad_compra: string;
  cantidad_comprada: number;
  precio_compra: number;
  costo_por_unidad_base: number;
  medio_pago: MedioPago;
}

export interface CompraInsumoInput {
  insumo_id: number;
  fecha: string;
  unidad_compra: string;
  cantidad_comprada: number;
  precio_compra: number;
  costo_por_unidad_base: number;
  medio_pago: MedioPago;
  actualizar_costo_referencia: boolean;
}

