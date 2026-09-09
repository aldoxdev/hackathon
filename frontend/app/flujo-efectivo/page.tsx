"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fechaEnPeriodo, finDePeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";
import {
  CompraInsumo,
  ConfiguracionNegocio,
  ConsumoIndirecto,
  DIRECCION_TRASPASO_LABEL,
  GastoFijo,
  Insumo,
  MedioPago,
  Receta,
  TraspasoCaja,
  Venta,
} from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { HelpIcon } from "@/components/HelpIcon";
import { PageHeader } from "@/components/PageHeader";

function sumaPorMedio<T>(
  items: T[],
  medioDe: (item: T) => MedioPago,
  montoDe: (item: T) => number,
  medio: MedioPago
): number {
  return items.filter((item) => medioDe(item) === medio).reduce((s, item) => s + montoDe(item), 0);
}

export default function FlujoEfectivoPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [consumoIndirecto, setConsumoIndirecto] = useState<ConsumoIndirecto[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [comprasInsumo, setComprasInsumo] = useState<CompraInsumo[]>([]);
  const [traspasos, setTraspasos] = useState<TraspasoCaja[]>([]);
  const [config, setConfig] = useState<ConfiguracionNegocio | null>(null);
  const [loading, setLoading] = useState(true);
  const { periodo } = usePeriodo();
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getVentas(),
      api.getRecetas(),
      api.getInsumos(),
      api.getConsumoIndirecto(),
      api.getGastosFijos(),
      api.getComprasInsumo(),
      api.getTraspasosCaja(),
      api.getConfiguracionNegocio(),
    ]).then(([v, r, i, ci, g, compras, traspasosData, c]) => {
      setVentas(v);
      setRecetas(r);
      setInsumos(i);
      setConsumoIndirecto(ci);
      setGastosFijos(g);
      setComprasInsumo(compras);
      setTraspasos(traspasosData);
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const recetasById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  // --- Movimiento neto del periodo seleccionado (solo lo que cae dentro de ese periodo) ---
  const ventasDelPeriodo = ventas.filter((v) => fechaEnPeriodo(v.fecha, periodo));
  const gastosFijosDelPeriodo = gastosFijos.filter((g) => fechaEnPeriodo(g.periodo, periodo));
  const consumoIndirectoDelPeriodo = consumoIndirecto.filter((c) => fechaEnPeriodo(c.periodo, periodo));
  const comprasDelPeriodo = comprasInsumo.filter((c) => fechaEnPeriodo(c.fecha, periodo));

  const ingresosEfectivoPeriodo = sumaPorMedio(ventasDelPeriodo, (v) => v.medio_pago, (v) => Number(v.total_venta), "efectivo");
  const ingresosBancoPeriodo = sumaPorMedio(ventasDelPeriodo, (v) => v.medio_pago, (v) => Number(v.total_venta), "banco");

  const egresosEfectivoPeriodo =
    sumaPorMedio(gastosFijosDelPeriodo, (g) => g.medio_pago, (g) => Number(g.monto_mensual), "efectivo") +
    sumaPorMedio(consumoIndirectoDelPeriodo, (c) => c.medio_pago, (c) => Number(c.monto_gastado), "efectivo") +
    sumaPorMedio(comprasDelPeriodo, (c) => c.medio_pago, (c) => Number(c.precio_compra), "efectivo");
  const egresosBancoPeriodo =
    sumaPorMedio(gastosFijosDelPeriodo, (g) => g.medio_pago, (g) => Number(g.monto_mensual), "banco") +
    sumaPorMedio(consumoIndirectoDelPeriodo, (c) => c.medio_pago, (c) => Number(c.monto_gastado), "banco") +
    sumaPorMedio(comprasDelPeriodo, (c) => c.medio_pago, (c) => Number(c.precio_compra), "banco");

  const traspasosDelPeriodo = traspasos.filter((t) => fechaEnPeriodo(t.fecha, periodo));
  const netoCajaABancoPeriodo =
    traspasosDelPeriodo.filter((t) => t.direccion === "caja_a_banco").reduce((s, t) => s + Number(t.monto), 0) -
    traspasosDelPeriodo.filter((t) => t.direccion === "banco_a_caja").reduce((s, t) => s + Number(t.monto), 0);

  const movimientoNetoEfectivo = ingresosEfectivoPeriodo - egresosEfectivoPeriodo - netoCajaABancoPeriodo;
  const movimientoNetoBanco = ingresosBancoPeriodo - egresosBancoPeriodo + netoCajaABancoPeriodo;

  // --- Saldo acumulado a la fecha: saldo inicial + todo lo registrado desde esa fecha hasta
  // el final del periodo que se este viendo (no solo lo del periodo, sino todo el historial). ---
  const finPeriodo = finDePeriodo(periodo);
  const fechaInicioSaldo = config?.fecha_saldo_inicial ?? finPeriodo;
  const enVigencia = (fecha: string) => fecha >= fechaInicioSaldo && fecha <= finPeriodo;

  // Gastos Fijos y Consumo Indirecto se registran por MES completo (periodo = dia 1 de ese mes),
  // no por un dia especifico de pago. Compararlos contra el dia exacto de fecha_saldo_inicial
  // rompe en cuanto ese dia no es el 1: el mes en que arranca el saldo inicial quedaria excluido
  // por completo del acumulado aunque si cuente en "Movimiento neto del periodo". Por eso se
  // comparan a nivel mes (YYYY-MM), no a nivel dia.
  const mesFechaInicioSaldo = fechaInicioSaldo.slice(0, 7);
  const mesFinPeriodo = finPeriodo.slice(0, 7);
  const enVigenciaMensual = (periodoMensual: string) => {
    const mes = periodoMensual.slice(0, 7);
    return mes >= mesFechaInicioSaldo && mes <= mesFinPeriodo;
  };

  const ventasAcumuladas = ventas.filter((v) => enVigencia(v.fecha));
  const gastosAcumulados = gastosFijos.filter((g) => enVigenciaMensual(g.periodo));
  const consumoAcumulado = consumoIndirecto.filter((c) => enVigenciaMensual(c.periodo));
  const comprasAcumuladas = comprasInsumo.filter((c) => enVigencia(c.fecha));

  const ingresosEfectivoAcum = sumaPorMedio(ventasAcumuladas, (v) => v.medio_pago, (v) => Number(v.total_venta), "efectivo");
  const ingresosBancoAcum = sumaPorMedio(ventasAcumuladas, (v) => v.medio_pago, (v) => Number(v.total_venta), "banco");
  const egresosEfectivoAcum =
    sumaPorMedio(gastosAcumulados, (g) => g.medio_pago, (g) => Number(g.monto_mensual), "efectivo") +
    sumaPorMedio(consumoAcumulado, (c) => c.medio_pago, (c) => Number(c.monto_gastado), "efectivo") +
    sumaPorMedio(comprasAcumuladas, (c) => c.medio_pago, (c) => Number(c.precio_compra), "efectivo");
  const egresosBancoAcum =
    sumaPorMedio(gastosAcumulados, (g) => g.medio_pago, (g) => Number(g.monto_mensual), "banco") +
    sumaPorMedio(consumoAcumulado, (c) => c.medio_pago, (c) => Number(c.monto_gastado), "banco") +
    sumaPorMedio(comprasAcumuladas, (c) => c.medio_pago, (c) => Number(c.precio_compra), "banco");

  const traspasosAcumulados = traspasos.filter((t) => enVigencia(t.fecha));
  const netoCajaABancoAcum =
    traspasosAcumulados.filter((t) => t.direccion === "caja_a_banco").reduce((s, t) => s + Number(t.monto), 0) -
    traspasosAcumulados.filter((t) => t.direccion === "banco_a_caja").reduce((s, t) => s + Number(t.monto), 0);

  const saldoInicialEfectivo = Number(config?.saldo_inicial_efectivo ?? 0);
  const saldoInicialBanco = Number(config?.saldo_inicial_banco ?? 0);
  const saldoEfectivoActual = saldoInicialEfectivo + ingresosEfectivoAcum - egresosEfectivoAcum - netoCajaABancoAcum;
  const saldoBancoActual = saldoInicialBanco + ingresosBancoAcum - egresosBancoAcum + netoCajaABancoAcum;

  // --- Desgloses por concepto (dentro del periodo seleccionado), separados por medio de pago:
  // a diferencia de Estado de Resultados, aqui el punto es precisamente cuanto de cada concepto
  // entro/salio en efectivo vs. en banco, no solo el total. ---
  const ingresosPorReceta = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; unidades: number; efectivo: number; banco: number }>();
    for (const v of ventasDelPeriodo) {
      const receta = recetasById.get(v.receta_id);
      const actual = acumulado.get(v.receta_id) ?? {
        nombre: receta?.nombre ?? "(receta eliminada)",
        unidades: 0,
        efectivo: 0,
        banco: 0,
      };
      actual.unidades += Number(v.cantidad_vendida);
      if (v.medio_pago === "efectivo") actual.efectivo += Number(v.total_venta);
      else actual.banco += Number(v.total_venta);
      acumulado.set(v.receta_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.efectivo + b.banco - (a.efectivo + a.banco));
  }, [ventasDelPeriodo, recetasById]);

  const egresosComprasPorInsumo = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; efectivo: number; banco: number }>();
    for (const c of comprasDelPeriodo) {
      const insumo = insumosById.get(c.insumo_id);
      const actual = acumulado.get(c.insumo_id) ?? {
        nombre: insumo?.nombre ?? "(insumo eliminado)",
        efectivo: 0,
        banco: 0,
      };
      if (c.medio_pago === "efectivo") actual.efectivo += Number(c.precio_compra);
      else actual.banco += Number(c.precio_compra);
      acumulado.set(c.insumo_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.efectivo + b.banco - (a.efectivo + a.banco));
  }, [comprasDelPeriodo, insumosById]);

  const egresosConsumoPorInsumo = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; efectivo: number; banco: number }>();
    for (const c of consumoIndirectoDelPeriodo) {
      const insumo = insumosById.get(c.insumo_id);
      const actual = acumulado.get(c.insumo_id) ?? {
        nombre: insumo?.nombre ?? "(insumo eliminado)",
        efectivo: 0,
        banco: 0,
      };
      if (c.medio_pago === "efectivo") actual.efectivo += Number(c.monto_gastado);
      else actual.banco += Number(c.monto_gastado);
      acumulado.set(c.insumo_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.efectivo + b.banco - (a.efectivo + a.banco));
  }, [consumoIndirectoDelPeriodo, insumosById]);

  const traspasosDetalle = useMemo(
    () =>
      [...traspasosDelPeriodo]
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .map((t) => ({
          etiqueta: DIRECCION_TRASPASO_LABEL[t.direccion],
          nota: t.fecha + (t.nota ? ` — ${t.nota}` : ""),
          valor: t.direccion === "caja_a_banco" ? Number(t.monto) : -Number(t.monto),
        })),
    [traspasosDelPeriodo]
  );

  const egresosPorGastoFijo = useMemo(() => {
    const acumulado = new Map<string, { categoria: string; efectivo: number; banco: number }>();
    for (const g of gastosFijosDelPeriodo) {
      const actual = acumulado.get(g.concepto) ?? { categoria: g.categoria, efectivo: 0, banco: 0 };
      if (g.medio_pago === "efectivo") actual.efectivo += Number(g.monto_mensual);
      else actual.banco += Number(g.monto_mensual);
      acumulado.set(g.concepto, actual);
    }
    return [...acumulado.entries()]
      .map(([concepto, v]) => ({ concepto, categoria: v.categoria, efectivo: v.efectivo, banco: v.banco }))
      .sort((a, b) => b.efectivo + b.banco - (a.efectivo + a.banco));
  }, [gastosFijosDelPeriodo]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Flujo de efectivo"
        subtitle={
          <>
            Cuanto dinero entro y salio de verdad, por efectivo y por banco. Viendo:{" "}
            <strong>{PERIODO_LABEL[periodo]}</strong>.
          </>
        }
        mostrarPeriodo
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="flex items-center text-sm font-medium text-zinc-900">
            Movimiento neto del periodo
            <HelpIcon texto="Entradas menos salidas, solo de lo que paso dentro del periodo que estas viendo." />
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <FilaSaldo label="Efectivo" valor={movimientoNetoEfectivo} />
            <FilaSaldo label="Banco" valor={movimientoNetoBanco} />
            <FilaSaldo label="Total" valor={movimientoNetoEfectivo + movimientoNetoBanco} destacar />
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="flex items-center text-sm font-medium text-zinc-900">
            Saldo estimado a la fecha
            <HelpIcon texto="Tu saldo inicial (capturado en Configuracion) mas todo lo que has registrado desde entonces hasta el fin de este periodo. Es tan exacto como lo que hayas capturado en la app." />
          </p>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <FilaSaldo label="Efectivo" valor={saldoEfectivoActual} />
            <FilaSaldo label="Banco" valor={saldoBancoActual} />
            <FilaSaldo label="Total" valor={saldoEfectivoActual + saldoBancoActual} destacar />
          </dl>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMostrarDetalle((v) => !v)}
        className="self-start text-sm font-medium text-zinc-700 hover:underline"
      >
        {mostrarDetalle ? "Ocultar detalle por concepto ▲" : "Ver detalle por concepto ▼"}
      </button>

      {mostrarDetalle && (
        <div className="flex flex-col gap-4">
          <DetalleTablaFlujo
            titulo="Ingresos por platillo"
            filas={ingresosPorReceta.map((f) => ({
              etiqueta: f.nombre,
              nota: `${f.unidades} unidades`,
              efectivo: f.efectivo,
              banco: f.banco,
            }))}
            vacio="No hay ventas registradas en este periodo."
          />
          <DetalleTablaFlujo
            titulo="Egresos por compra de insumos"
            filas={egresosComprasPorInsumo.map((f) => ({ etiqueta: f.nombre, efectivo: f.efectivo, banco: f.banco }))}
            vacio="No hay compras de insumos registradas en este periodo."
            signo={-1}
          />
          <DetalleTablaFlujo
            titulo="Egresos por consumo indirecto"
            filas={egresosConsumoPorInsumo.map((f) => ({ etiqueta: f.nombre, efectivo: f.efectivo, banco: f.banco }))}
            vacio="No hay consumo indirecto registrado en este periodo."
            signo={-1}
          />
          <DetalleTablaFlujo
            titulo="Egresos por gastos fijos"
            filas={egresosPorGastoFijo.map((f) => ({
              etiqueta: f.concepto,
              nota: f.categoria,
              efectivo: f.efectivo,
              banco: f.banco,
            }))}
            vacio="No hay gastos fijos registrados en este periodo."
            signo={-1}
          />
          <DetalleTabla
            titulo="Traspasos entre caja y banco (positivo = hacia banco)"
            filas={traspasosDetalle}
            vacio="No hay traspasos registrados en este periodo."
          />
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>
          Este es un flujo de efectivo simplificado: asume que toda venta se cobra y todo gasto o
          compra se paga el mismo dia en que se registra (no maneja creditos).
        </p>
        <p className="mt-1">
          El saldo estimado solo es tan exacto como lo que registres aqui — no incluye movimientos
          fuera de la app (por ejemplo, retiros personales del dueño), que quedan para una version
          futura. Los traspasos entre tu caja y tu banco si se registran (Movimientos &gt;
          Traspasos caja-banco).
        </p>
      </div>
    </div>
  );
}

function FilaSaldo({ label, valor, destacar }: { label: string; valor: number; destacar?: boolean }) {
  return (
    <div
      className={`flex justify-between ${
        destacar ? "border-t border-zinc-200 pt-2 font-medium text-zinc-900" : "text-zinc-700"
      }`}
    >
      <dt>{label}</dt>
      <dd className={valor < 0 ? "text-red-600" : ""}>{formatMoney(valor)}</dd>
    </div>
  );
}

function DetalleTablaFlujo({
  titulo,
  filas,
  vacio,
  signo = 1,
}: {
  titulo: string;
  filas: { etiqueta: string; nota?: string; efectivo: number; banco: number }[];
  vacio: string;
  signo?: 1 | -1;
}) {
  const totalEfectivo = filas.reduce((s, f) => s + f.efectivo, 0);
  const totalBanco = filas.reduce((s, f) => s + f.banco, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-900">{titulo}</p>
      {filas.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">{vacio}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="py-1 font-medium">Concepto</th>
                <th className="px-2 py-1 text-right font-medium">Efectivo</th>
                <th className="px-2 py-1 text-right font-medium">Banco</th>
                <th className="py-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filas.map((f) => (
                <tr key={f.etiqueta}>
                  <td className="py-1.5 text-zinc-700">
                    {f.etiqueta}
                    {f.nota && <span className="ml-1.5 text-xs text-zinc-400">({f.nota})</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-zinc-600">{formatMoney(signo * f.efectivo)}</td>
                  <td className="px-2 py-1.5 text-right text-zinc-600">{formatMoney(signo * f.banco)}</td>
                  <td className="py-1.5 text-right font-medium text-zinc-900">
                    {formatMoney(signo * (f.efectivo + f.banco))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium">
                <td className="py-1.5 text-zinc-900">Total</td>
                <td className="px-2 py-1.5 text-right text-zinc-900">{formatMoney(signo * totalEfectivo)}</td>
                <td className="px-2 py-1.5 text-right text-zinc-900">{formatMoney(signo * totalBanco)}</td>
                <td className="py-1.5 text-right text-zinc-900">
                  {formatMoney(signo * (totalEfectivo + totalBanco))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function DetalleTabla({
  titulo,
  filas,
  vacio,
}: {
  titulo: string;
  filas: { etiqueta: string; nota?: string; valor: number }[];
  vacio: string;
}) {
  const total = filas.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm font-medium text-zinc-900">{titulo}</p>
      {filas.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">{vacio}</p>
      ) : (
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          {filas.map((f) => (
            <div key={f.etiqueta} className="flex items-baseline justify-between">
              <dt className="text-zinc-700">
                {f.etiqueta}
                {f.nota && <span className="ml-1.5 text-xs text-zinc-400">({f.nota})</span>}
              </dt>
              <dd className="text-zinc-900">{formatMoney(f.valor)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-zinc-200 pt-1.5 font-medium">
            <dt className="text-zinc-900">Total</dt>
            <dd className="text-zinc-900">{formatMoney(total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
