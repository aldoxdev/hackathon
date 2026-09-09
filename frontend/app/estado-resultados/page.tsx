"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";
import { ConsumoIndirecto, GastoFijo, Insumo, Receta, Venta } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

export default function EstadoResultadosPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [consumoIndirecto, setConsumoIndirecto] = useState<ConsumoIndirecto[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
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
    ]).then(([v, r, i, ci, g]) => {
      setVentas(v);
      setRecetas(r);
      setInsumos(i);
      setConsumoIndirecto(ci);
      setGastosFijos(g);
      setLoading(false);
    });
  }, []);

  const recetasById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const ventasDelPeriodo = ventas.filter((v) => fechaEnPeriodo(v.fecha, periodo));
  const ingresos = ventasDelPeriodo.reduce((s, v) => s + Number(v.total_venta), 0);
  const costoDirecto = ventasDelPeriodo.reduce((s, v) => s + Number(v.costo_insumos_snapshot), 0);
  const consumoIndirectoDelPeriodo = consumoIndirecto.filter((c) => fechaEnPeriodo(c.periodo, periodo));
  const costoIndirecto = consumoIndirectoDelPeriodo.reduce((s, c) => s + Number(c.monto_gastado), 0);
  const costoVentas = costoDirecto + costoIndirecto;
  const utilidadBruta = ingresos - costoVentas;

  const gastosFijosDelPeriodo = gastosFijos.filter((g) => fechaEnPeriodo(g.periodo, periodo));
  const gastosOperacion = gastosFijosDelPeriodo.reduce((s, g) => s + Number(g.monto_mensual), 0);
  const utilidadNeta = utilidadBruta - gastosOperacion;

  const ivaTrasladado = ventasDelPeriodo.reduce((s, v) => {
    const receta = recetasById.get(v.receta_id);
    if (receta?.tasa_iva === "iva_16") {
      return s + Number(v.total_venta) * (0.16 / 1.16);
    }
    return s;
  }, 0);

  // --- Desgloses por concepto (solo se calculan para mostrarse si el usuario pide el detalle) ---
  const ingresosPorReceta = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; unidades: number; total: number }>();
    for (const v of ventasDelPeriodo) {
      const receta = recetasById.get(v.receta_id);
      const actual = acumulado.get(v.receta_id) ?? {
        nombre: receta?.nombre ?? "(receta eliminada)",
        unidades: 0,
        total: 0,
      };
      actual.unidades += Number(v.cantidad_vendida);
      actual.total += Number(v.total_venta);
      acumulado.set(v.receta_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.total - a.total);
  }, [ventasDelPeriodo, recetasById]);

  const costoDirectoPorReceta = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; total: number }>();
    for (const v of ventasDelPeriodo) {
      const receta = recetasById.get(v.receta_id);
      const actual = acumulado.get(v.receta_id) ?? {
        nombre: receta?.nombre ?? "(receta eliminada)",
        total: 0,
      };
      actual.total += Number(v.costo_insumos_snapshot);
      acumulado.set(v.receta_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.total - a.total);
  }, [ventasDelPeriodo, recetasById]);

  const costoIndirectoPorInsumo = useMemo(() => {
    const acumulado = new Map<number, { nombre: string; total: number }>();
    for (const c of consumoIndirectoDelPeriodo) {
      const insumo = insumosById.get(c.insumo_id);
      const actual = acumulado.get(c.insumo_id) ?? {
        nombre: insumo?.nombre ?? "(insumo eliminado)",
        total: 0,
      };
      actual.total += Number(c.monto_gastado);
      acumulado.set(c.insumo_id, actual);
    }
    return [...acumulado.values()].sort((a, b) => b.total - a.total);
  }, [consumoIndirectoDelPeriodo, insumosById]);

  const gastosPorConcepto = useMemo(() => {
    const acumulado = new Map<string, { categoria: string; total: number }>();
    for (const g of gastosFijosDelPeriodo) {
      const actual = acumulado.get(g.concepto) ?? { categoria: g.categoria, total: 0 };
      actual.total += Number(g.monto_mensual);
      acumulado.set(g.concepto, actual);
    }
    return [...acumulado.entries()]
      .map(([concepto, v]) => ({ concepto, categoria: v.categoria, total: v.total }))
      .sort((a, b) => b.total - a.total);
  }, [gastosFijosDelPeriodo]);

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-10 text-zinc-500">Cargando...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Estado de Resultados"
        subtitle={
          <>
            Cifras antes de ISR. Viendo: <strong>{PERIODO_LABEL[periodo]}</strong>.
          </>
        }
        mostrarPeriodo
      />

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <Fila label="Ingresos por ventas" valor={ingresos} />
          <Fila label="(-) Costo de ventas" valor={-costoVentas} indent />
          <FilaDetalle label="Insumos directos" valor={-costoDirecto} />
          <FilaDetalle label="Consumo de insumos indirectos" valor={-costoIndirecto} />
          <FilaTotal label="= Utilidad bruta" valor={utilidadBruta} />
          <Fila label="(-) Gastos de operacion (gastos fijos)" valor={-gastosOperacion} indent />
          <FilaTotal label="= Utilidad de operacion / neta" valor={utilidadNeta} destacar />
        </dl>
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
          <DetalleTabla
            titulo="Ingresos por platillo"
            filas={ingresosPorReceta.map((f) => ({
              etiqueta: f.nombre,
              nota: `${f.unidades} unidades`,
              valor: f.total,
            }))}
            vacio="No hay ventas registradas en este periodo."
          />
          <DetalleTabla
            titulo="Costo de insumos directos por platillo"
            filas={costoDirectoPorReceta.map((f) => ({ etiqueta: f.nombre, valor: -f.total }))}
            vacio="No hay costo de insumos directos en este periodo."
          />
          <DetalleTabla
            titulo="Consumo de insumos indirectos por insumo"
            filas={costoIndirectoPorInsumo.map((f) => ({ etiqueta: f.nombre, valor: -f.total }))}
            vacio="No hay consumo indirecto registrado en este periodo."
          />
          <DetalleTabla
            titulo="Gastos de operacion por concepto"
            filas={gastosPorConcepto.map((f) => ({
              etiqueta: f.concepto,
              nota: f.categoria,
              valor: -f.total,
            }))}
            vacio="No hay gastos fijos registrados."
          />
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>
          IVA trasladado (informativo, no forma parte de la utilidad): {formatMoney(ivaTrasladado)}
        </p>
        <p className="mt-1">
          Estas cifras no incluyen ISR. Consulta la seccion &quot;Alcance del MVP&quot; para ver
          que otros calculos fiscales quedan fuera de esta version.
        </p>
      </div>
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

function Fila({ label, valor, indent }: { label: string; valor: number; indent?: boolean }) {
  return (
    <div className={`flex justify-between ${indent ? "text-zinc-600" : "text-zinc-900"}`}>
      <dt>{label}</dt>
      <dd>{formatMoney(valor)}</dd>
    </div>
  );
}

function FilaDetalle({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between pl-4 text-xs text-zinc-500">
      <dt>{label}</dt>
      <dd>{formatMoney(valor)}</dd>
    </div>
  );
}

function FilaTotal({
  label,
  valor,
  destacar,
}: {
  label: string;
  valor: number;
  destacar?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-t border-zinc-200 pt-3 font-medium ${
        destacar ? "text-lg text-zinc-900" : "text-zinc-900"
      }`}
    >
      <dt>{label}</dt>
      <dd className={valor < 0 ? "text-red-600" : ""}>{formatMoney(valor)}</dd>
    </div>
  );
}
