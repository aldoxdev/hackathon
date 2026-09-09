import { fechaEnPeriodo, PeriodoTipo } from "./periodo";
import { ConsumoIndirecto, Venta } from "./types";

export interface IndicadoresMes {
  ventasTotales: number;
  costoVariableTotal: number; // solo insumos directos (usado para "costo de alimentos %")
  costoIndirectoTotal: number;
  margenContribucionTotal: number; // ventas - costo directo - costo indirecto
  foodCostPct: number;
  unidadesVendidas: number;
  numeroTransacciones: number;
  ticketPromedio: number;
  margenContribucionPromedioUnitario: number;
}

export function calcularIndicadoresPeriodo(
  ventas: Venta[],
  consumoIndirecto: ConsumoIndirecto[],
  tipo: PeriodoTipo,
  anterior = false
): IndicadoresMes {
  const ventasDelPeriodo = ventas.filter((v) => fechaEnPeriodo(v.fecha, tipo, anterior));
  const ventasTotales = ventasDelPeriodo.reduce((s, v) => s + Number(v.total_venta), 0);
  const costoVariableTotal = ventasDelPeriodo.reduce(
    (s, v) => s + Number(v.costo_insumos_snapshot),
    0
  );
  // El "costo de alimentos %" es, por convencion de la industria, solo insumos directos —
  // pero margen de contribucion / rentabilidad neta / punto de equilibrio deben incluir
  // tambien el consumo de insumos indirectos, igual que hace Estado de Resultados (ambos
  // caen bajo "costo de ventas" ahi). Antes esta funcion omitia el indirecto por completo,
  // haciendo que el Dashboard no coincidiera con Estado de Resultados.
  const costoIndirectoTotal = consumoIndirecto
    .filter((c) => fechaEnPeriodo(c.periodo, tipo, anterior))
    .reduce((s, c) => s + Number(c.monto_gastado), 0);
  const margenContribucionTotal = ventasTotales - costoVariableTotal - costoIndirectoTotal;
  const unidadesVendidas = ventasDelPeriodo.reduce((s, v) => s + Number(v.cantidad_vendida), 0);
  const numeroTransacciones = ventasDelPeriodo.length;

  return {
    ventasTotales,
    costoVariableTotal,
    costoIndirectoTotal,
    margenContribucionTotal,
    foodCostPct: ventasTotales > 0 ? (costoVariableTotal / ventasTotales) * 100 : 0,
    unidadesVendidas,
    numeroTransacciones,
    ticketPromedio: numeroTransacciones > 0 ? ventasTotales / numeroTransacciones : 0,
    margenContribucionPromedioUnitario:
      unidadesVendidas > 0 ? margenContribucionTotal / unidadesVendidas : 0,
  };
}

// Variacion porcentual contra el periodo anterior equivalente (para las tarjetas de tendencia).
export function calcularVariacionPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

// Punto de equilibrio = Gastos fijos totales / Margen de contribucion promedio (seccion 6 del analisis).
export function calcularPuntoEquilibrioUnidades(
  gastosFijosTotales: number,
  margenContribucionPromedioUnitario: number
): number | null {
  if (margenContribucionPromedioUnitario <= 0) return null;
  return gastosFijosTotales / margenContribucionPromedioUnitario;
}

// Rentabilidad neta % = (Margen de contribucion - Gastos fijos) / Ventas x 100.
export function calcularRentabilidadNetaPct(
  ventasTotales: number,
  margenContribucionTotal: number,
  gastosFijosTotales: number
): number {
  if (ventasTotales <= 0) return 0;
  return ((margenContribucionTotal - gastosFijosTotales) / ventasTotales) * 100;
}

export interface VentasPorMes {
  mes: string; // YYYY-MM
  ventas: number;
  costo: number;
  margen: number;
}

// Agrupa las ventas por mes calendario, ordenado cronologicamente, para graficas de tendencia.
// Incluye el consumo indirecto en el costo de cada mes, igual que margenContribucionTotal.
export function agruparVentasPorMes(
  ventas: Venta[],
  consumoIndirecto: ConsumoIndirecto[] = []
): VentasPorMes[] {
  const acumulado = new Map<string, { ventas: number; costo: number }>();
  for (const v of ventas) {
    const mes = v.fecha.slice(0, 7);
    const actual = acumulado.get(mes) ?? { ventas: 0, costo: 0 };
    actual.ventas += Number(v.total_venta);
    actual.costo += Number(v.costo_insumos_snapshot);
    acumulado.set(mes, actual);
  }
  for (const c of consumoIndirecto) {
    const mes = c.periodo.slice(0, 7);
    const actual = acumulado.get(mes) ?? { ventas: 0, costo: 0 };
    actual.costo += Number(c.monto_gastado);
    acumulado.set(mes, actual);
  }
  return [...acumulado.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([mes, { ventas, costo }]) => ({ mes, ventas, costo, margen: ventas - costo }));
}
