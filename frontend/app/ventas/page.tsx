"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { calcularCostoReceta } from "@/lib/costeo";
import { Insumo, MEDIO_PAGO_LABEL, MedioPago, Receta, RecetaInsumo, Venta } from "@/lib/types";
import { HelpIcon } from "@/components/HelpIcon";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton } from "@/components/RowActions";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const LIMITE_TABLA = 150;

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetaInsumos, setRecetaInsumos] = useState<RecetaInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [ventaOriginal, setVentaOriginal] = useState<Venta | null>(null);
  // Ver todas: por default la tabla se corta en LIMITE_TABLA para no renderizar cientos de filas
  // de golpe (bueno para movil), pero un solo clic la expande completa - asi Ctrl+F del navegador
  // encuentra cualquier venta, sin tener que adivinar "en que pagina esta".
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const [recetaId, setRecetaId] = useState<number | "">("");
  const [cantidadVendida, setCantidadVendida] = useState("1");
  const [fecha, setFecha] = useState(hoyISO());
  const [medioPago, setMedioPago] = useState<MedioPago>("efectivo");

  const { periodo, setPeriodo } = usePeriodo();

  function cargar() {
    setLoading(true);
    Promise.all([api.getVentas(), api.getRecetas(), api.getInsumos(), api.getRecetaInsumos()])
      .then(([v, r, i, ri]) => {
        setVentas(v);
        setRecetas(r);
        setInsumos(i);
        setRecetaInsumos(ri);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  // Si cambias de periodo (ej. de "Este mes" a "Todo el historial"), no queremos arrastrar
  // "ver todas" a un periodo con miles de filas sin que el usuario lo pida de nuevo.
  useEffect(() => {
    setMostrarTodas(false);
  }, [periodo]);

  const recetasById = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const recetaSeleccionada = recetaId ? recetasById.get(recetaId) : undefined;
  const cantidadNum = parseFloat(cantidadVendida) || 0;
  const costoUnitario = recetaId ? calcularCostoReceta(recetaId, recetaInsumos, insumosById) : 0;
  const totalVentaPreview = (recetaSeleccionada?.precio_venta ?? 0) * cantidadNum;
  const costoSnapshotPreview = costoUnitario * cantidadNum;

  function limpiarFormulario() {
    setEditandoId(null);
    setVentaOriginal(null);
    setRecetaId("");
    setCantidadVendida("1");
    setFecha(hoyISO());
    setMedioPago("efectivo");
  }

  function handleEditar(venta: Venta) {
    setEditandoId(venta.id);
    setVentaOriginal(venta);
    setRecetaId(venta.receta_id);
    setCantidadVendida(String(venta.cantidad_vendida));
    setFecha(venta.fecha);
    setMedioPago(venta.medio_pago);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!recetaId || !recetaSeleccionada || cantidadNum <= 0 || !fecha) {
      setError("Selecciona una receta, una cantidad valida y una fecha.");
      return;
    }

    // Si solo se corrige fecha/medio de pago, el total y el costo congelado no se recalculan.
    // Si la receta o la cantidad cambian, si es una venta distinta y se recalcula con precios actuales.
    const sinCambiosDeVenta =
      ventaOriginal &&
      ventaOriginal.receta_id === recetaId &&
      ventaOriginal.cantidad_vendida === cantidadNum;

    const totalVenta = sinCambiosDeVenta ? Number(ventaOriginal.total_venta) : totalVentaPreview;
    const costoSnapshot = sinCambiosDeVenta
      ? Number(ventaOriginal.costo_insumos_snapshot)
      : costoSnapshotPreview;

    setSaving(true);
    try {
      const payload = {
        receta_id: recetaId,
        cantidad_vendida: cantidadNum,
        fecha,
        medio_pago: medioPago,
        total_venta: totalVenta,
        costo_insumos_snapshot: costoSnapshot,
      };
      if (editandoId) {
        await api.updateVenta(editandoId, payload);
      } else {
        await api.createVenta(payload);
      }
      limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      await api.deleteVenta(id);
      if (editandoId === id) limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const ventasDelPeriodo = ventas.filter((v) => fechaEnPeriodo(v.fecha, periodo));
  const totalPeriodo = ventasDelPeriodo.reduce((sum, v) => sum + Number(v.total_venta), 0);
  const totalBanco = ventasDelPeriodo
    .filter((v) => v.medio_pago === "banco")
    .reduce((sum, v) => sum + Number(v.total_venta), 0);
  const pctBanco = totalPeriodo > 0 ? (totalBanco / totalPeriodo) * 100 : 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Ventas"
        subtitle="Registra cada venta. El costo de insumos se congela al momento de vender, aunque el precio de los insumos cambie despues."
      />

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Receta vendida
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={recetaId}
              onChange={(e) => setRecetaId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Selecciona una receta</option>
              {recetas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} ({formatMoney(Number(r.precio_venta))})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Cantidad vendida
            <input
              type="number"
              min="1"
              step="1"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={cantidadVendida}
              onChange={(e) => setCantidadVendida(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Fecha
            <input
              type="date"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          <fieldset className="flex flex-col gap-1 text-sm">
            <legend className="mb-1">Medio de pago</legend>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={medioPago === "efectivo"}
                  onChange={() => setMedioPago("efectivo")}
                />
                Efectivo
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={medioPago === "banco"}
                  onChange={() => setMedioPago("banco")}
                />
                Banco
              </label>
            </div>
          </fieldset>
        </div>

        {recetaSeleccionada && cantidadNum > 0 && (
          <div className="mt-4 flex flex-wrap gap-6 rounded-md bg-zinc-50 px-4 py-3 text-sm">
            <span>
              Total de la venta: <strong>{formatMoney(totalVentaPreview)}</strong>
            </span>
            <span className="inline-flex items-center">
              Costo de insumos (congelado): <strong className="ml-1">{formatMoney(costoSnapshotPreview)}</strong>
              <HelpIcon texto="Este costo queda fijo para siempre en esta venta. Si despues cambia el precio de tus insumos, esta venta no se recalcula." />
            </span>
            <span>
              Margen: <strong>{formatMoney(totalVentaPreview - costoSnapshotPreview)}</strong>
            </span>
          </div>
        )}
        {editandoId &&
          ventaOriginal &&
          ventaOriginal.receta_id === recetaId &&
          ventaOriginal.cantidad_vendida === cantidadNum && (
            <p className="mt-2 text-xs text-zinc-500">
              No cambiaste receta ni cantidad: el total y el costo congelado se mantienen igual
              que en la venta original.
            </p>
          )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar venta"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Cancelar edicion
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-900">Historial</h2>
          <PeriodSelector value={periodo} onChange={setPeriodo} />
        </div>

        {!loading && (
          <div className="flex flex-wrap gap-6 rounded-lg border border-zinc-200 bg-white px-6 py-4 text-sm">
            <div>
              <span className="text-zinc-500">Ventas ({PERIODO_LABEL[periodo].toLowerCase()}): </span>
              <span className="font-medium text-zinc-900">{formatMoney(totalPeriodo)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-zinc-500">% en banco: </span>
              <span className="font-medium text-zinc-900">{pctBanco.toFixed(0)}%</span>
              <HelpIcon texto="Que porcentaje de tus ventas paso por el banco (tarjeta, transferencia) en vez de efectivo. Entre mas alto, mejor te ve una entidad de financiamiento." />
              {pctBanco < 50 && totalPeriodo > 0 && (
                <span className="ml-2 text-zinc-500">
                  (mas trazabilidad bancaria ayuda a futuro financiamiento)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Receta</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Margen</th>
              <th className="px-4 py-3 font-medium">Medio de pago</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={7}>
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && ventasDelPeriodo.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={7}>
                  No hay ventas registradas en {PERIODO_LABEL[periodo].toLowerCase()}.
                </td>
              </tr>
            )}
            {[...ventasDelPeriodo]
              .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
              .slice(0, mostrarTodas ? undefined : LIMITE_TABLA)
              .map((venta) => {
                const margen = Number(venta.total_venta) - Number(venta.costo_insumos_snapshot);
                return (
                  <tr key={venta.id}>
                    <td className="px-4 py-3">{venta.fecha}</td>
                    <td className="px-4 py-3">
                      {recetasById.get(venta.receta_id)?.nombre ?? "(receta eliminada)"}
                    </td>
                    <td className="px-4 py-3">{venta.cantidad_vendida}</td>
                    <td className="px-4 py-3">{formatMoney(Number(venta.total_venta))}</td>
                    <td className="px-4 py-3">{formatMoney(margen)}</td>
                    <td className="px-4 py-3">{MEDIO_PAGO_LABEL[venta.medio_pago]}</td>
                    <td className="px-4 py-3 text-right">
                      <EditarButton onClick={() => handleEditar(venta)} />
                      <EliminarButton onClick={() => handleDelete(venta.id)} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        </div>
      </div>
      {!loading && ventasDelPeriodo.length > LIMITE_TABLA && (
        <p className="text-xs text-zinc-500">
          {mostrarTodas ? (
            <>
              Mostrando las {ventasDelPeriodo.length} ventas de {PERIODO_LABEL[periodo].toLowerCase()}.{" "}
              <button type="button" onClick={() => setMostrarTodas(false)} className="font-medium underline">
                Mostrar menos
              </button>
            </>
          ) : (
            <>
              Mostrando las {LIMITE_TABLA} ventas mas recientes de {ventasDelPeriodo.length} en{" "}
              {PERIODO_LABEL[periodo].toLowerCase()}.{" "}
              <button type="button" onClick={() => setMostrarTodas(true)} className="font-medium underline">
                Ver todas
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
