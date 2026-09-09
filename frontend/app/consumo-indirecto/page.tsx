"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ConsumoIndirecto, Insumo, MedioPago, MEDIO_PAGO_LABEL } from "@/lib/types";
import { HelpIcon } from "@/components/HelpIcon";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton } from "@/components/RowActions";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";

function mesActualISO() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default function ConsumoIndirectoPage() {
  const [consumos, setConsumos] = useState<ConsumoIndirecto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [insumoId, setInsumoId] = useState<number | "">("");
  const [periodo, setPeriodo] = useState(mesActualISO());
  const [montoGastado, setMontoGastado] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("banco");

  const { periodo: periodoFiltro, setPeriodo: setPeriodoFiltro } = usePeriodo();

  function cargar() {
    setLoading(true);
    Promise.all([api.getConsumoIndirecto(), api.getInsumos()])
      .then(([c, i]) => {
        setConsumos(c);
        setInsumos(i);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  const insumosIndirectos = insumos.filter((i) => i.tipo_uso === "indirecto");
  const insumosById = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  function limpiarFormulario() {
    setEditandoId(null);
    setInsumoId("");
    setPeriodo(mesActualISO());
    setMontoGastado("");
    setMedioPago("banco");
  }

  function handleEditar(consumo: ConsumoIndirecto) {
    setEditandoId(consumo.id);
    setInsumoId(consumo.insumo_id);
    setPeriodo(consumo.periodo.slice(0, 7));
    setMontoGastado(String(consumo.monto_gastado));
    setMedioPago(consumo.medio_pago);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const monto = parseFloat(montoGastado);
    if (!insumoId || !periodo || !monto || monto <= 0) {
      setError("Selecciona un insumo, un mes y un monto valido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        insumo_id: insumoId,
        periodo: `${periodo}-01`,
        monto_gastado: monto,
        medio_pago: medioPago,
      };
      if (editandoId) {
        await api.updateConsumoIndirecto(editandoId, payload);
      } else {
        await api.createConsumoIndirecto(payload);
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
    if (!confirm("¿Eliminar este registro de consumo indirecto?")) return;
    try {
      await api.deleteConsumoIndirecto(id);
      if (editandoId === id) limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const consumosDelPeriodo = consumos.filter((c) => fechaEnPeriodo(c.periodo, periodoFiltro));
  const totalPeriodo = consumosDelPeriodo.reduce((sum, c) => sum + Number(c.monto_gastado), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Consumo de insumos indirectos"
        subtitle="Cada mes registra cuanto gastaste en insumos de uso general (servilletas, cebolla de mesa, gas, etc.) que no tienen receta propia."
      />

      {insumosIndirectos.length === 0 && !loading && (
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Aun no tienes insumos marcados como &quot;indirecto&quot;. Da de alta uno en la pantalla
          de Insumos primero.
        </p>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center">
              Insumo indirecto
              <HelpIcon texto="Solo aparecen aqui los insumos que marcaste como 'indirecto' al darlos de alta (uso general, sin receta propia)." />
            </span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecciona un insumo</option>
              {insumosIndirectos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Mes
            <input
              type="month"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Monto gastado ($)
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={montoGastado}
              onChange={(e) => setMontoGastado(e.target.value)}
              placeholder="Ej. 450"
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

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar consumo"}
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
          <PeriodSelector value={periodoFiltro} onChange={setPeriodoFiltro} />
        </div>

        {!loading && (
          <p className="text-sm text-zinc-600">
            Total de insumos indirectos ({PERIODO_LABEL[periodoFiltro].toLowerCase()}):{" "}
            <span className="font-medium text-zinc-900">{formatMoney(totalPeriodo)}</span>
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Mes</th>
              <th className="px-4 py-3 font-medium">Monto gastado</th>
              <th className="px-4 py-3 font-medium">Medio de pago</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && consumosDelPeriodo.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  No hay consumo indirecto registrado en {PERIODO_LABEL[periodoFiltro].toLowerCase()}.
                </td>
              </tr>
            )}
            {consumosDelPeriodo.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{insumosById.get(c.insumo_id)?.nombre ?? "(eliminado)"}</td>
                <td className="px-4 py-3">{c.periodo.slice(0, 7)}</td>
                <td className="px-4 py-3">{formatMoney(Number(c.monto_gastado))}</td>
                <td className="px-4 py-3">{MEDIO_PAGO_LABEL[c.medio_pago]}</td>
                <td className="px-4 py-3 text-right">
                  <EditarButton onClick={() => handleEditar(c)} />
                  <EliminarButton onClick={() => handleDelete(c.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
