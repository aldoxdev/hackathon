export type PeriodoTipo = "mes_actual" | "mes_pasado" | "anio_actual" | "anio_pasado" | "todo";

export const PERIODO_LABEL: Record<PeriodoTipo, string> = {
  mes_actual: "Este mes",
  mes_pasado: "Mes pasado",
  anio_actual: "Año actual",
  anio_pasado: "Año pasado",
  todo: "Todo el historial",
};

function mesISOConOffset(offsetMeses: number): string {
  const d = new Date();
  d.setDate(1); // evita que un dia 31 se "desborde" al ajustar el mes
  d.setMonth(d.getMonth() + offsetMeses);
  return d.toISOString().slice(0, 7);
}

function anioConOffset(offsetAnios: number): string {
  return String(new Date().getFullYear() + offsetAnios);
}

// tipo describe el periodo que se esta viendo; anterior=true pide el periodo equivalente previo
// (para comparaciones "vs periodo anterior"). "todo" no tiene un periodo anterior valido.
export function fechaEnPeriodo(fecha: string, tipo: PeriodoTipo, anterior = false): boolean {
  switch (tipo) {
    case "todo":
      return !anterior;
    case "mes_actual":
      return fecha.slice(0, 7) === mesISOConOffset(anterior ? -1 : 0);
    case "mes_pasado":
      return fecha.slice(0, 7) === mesISOConOffset(anterior ? -2 : -1);
    case "anio_actual":
      return fecha.slice(0, 4) === anioConOffset(anterior ? -1 : 0);
    case "anio_pasado":
      return fecha.slice(0, 4) === anioConOffset(anterior ? -2 : -1);
  }
}

export function tienePeriodoAnterior(tipo: PeriodoTipo): boolean {
  return tipo !== "todo";
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fecha de corte (inclusive) para calcular un SALDO ACUMULADO hasta el final de un periodo,
// a diferencia de fechaEnPeriodo (que solo prueba pertenencia a ese periodo). Ej. "año pasado"
// corta al 31 de diciembre del año pasado; "mes pasado" corta al ultimo dia de ese mes.
export function finDePeriodo(tipo: PeriodoTipo): string {
  switch (tipo) {
    case "mes_actual":
    case "anio_actual":
    case "todo":
      return hoyISO();
    case "mes_pasado": {
      const d = new Date();
      d.setDate(1); // primer dia del mes actual...
      d.setDate(0); // ...retrocedido un dia = ultimo dia del mes pasado
      return d.toISOString().slice(0, 10);
    }
    case "anio_pasado":
      return `${new Date().getFullYear() - 1}-12-31`;
  }
}
