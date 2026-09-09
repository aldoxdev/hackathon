import { Insumo, RecetaInsumo } from "./types";

export function calcularCostoReceta(
  recetaId: number,
  recetaInsumos: RecetaInsumo[],
  insumosById: Map<number, Insumo>
): number {
  return recetaInsumos
    .filter((ri) => ri.receta_id === recetaId)
    .reduce((total, ri) => {
      const insumo = insumosById.get(ri.insumo_id);
      if (!insumo) return total;
      return total + ri.cantidad_usada * Number(insumo.costo_por_unidad_base);
    }, 0);
}
