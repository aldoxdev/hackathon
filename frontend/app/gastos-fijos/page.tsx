"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { GastoFijo, MEDIO_PAGO_LABEL, MedioPago, TASA_IVA_LABEL, TasaIva } from "@/lib/types";
import { HelpIcon } from "@/components/HelpIcon";
import { PageHeader } from "@/components/PageHeader";
import { PeriodSelector } from "@/components/PeriodSelector";
import { formatMoney } from "@/lib/format";
import { EditarButton, EliminarButton } from "@/components/RowActions";
import { fechaEnPeriodo, PERIODO_LABEL } from "@/lib/periodo";
import { usePeriodo } from "@/lib/periodo-context";

const TASAS_IVA: TasaIva[] = ["iva_16", "iva_0", "exento", "no_objeto"];
const CATEGORIAS_SUGERIDAS = ["Renta", "Nomina", "Luz", "Agua", "Internet", "Gas", "Mantenimiento"];

function mesActualISO() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function mesLegible(mesISO: string) {
  const [anio, mes] = mesISO.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export default function GastosFijosPage() {
  const [gastos, setGastos] = useState<GastoFijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [periodo, setPeriodo] = useState(mesActualISO());
  const [concepto, setConcepto] = useState("");
  const [montoMensual, setMontoMensual] = useState("");
  const [categoria, setCategoria] = useState("");
  const [medioPago, setMedioPago] = useState<MedioPago>("banco");
  const [tratamientoFiscal, setTratamientoFiscal] = useState<TasaIva>("iva_16");

  const { periodo: periodoFiltro, setPeriodo: setPeriodoFiltro } = usePeriodo();

  function cargar() {
    setLoading(true);
    api
      .getGastosFijos()
      .then(setGastos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    cargar();
  }, []);

  const gastosDelMesCaptura = useMemo(
    () => gastos.filter((g) => g.periodo.slice(0, 7) === periodo),
    [gastos, periodo]
  );

  const mesAnteriorConDatos = useMemo(() => {
    const meses = [...new Set(gastos.map((g) => g.periodo.slice(0, 7)))].sort();
    return meses.filter((m) => m < periodo).at(-1) ?? null;
  }, [gastos, periodo]);

  const mostrarPrecarga = !loading && gastosDelMesCaptura.length === 0 && !!mesAnteriorConDatos;

  function limpiarFormulario() {
    setEditandoId(null);
    setPeriodo(mesActualISO());
    setConcepto("");
    setMontoMensual("");
    setCategoria("");
    setMedioPago("banco");
    setTratamientoFiscal("iva_16");
  }

  function handleEditar(gasto: GastoFijo) {
    setEditandoId(gasto.id);
    setPeriodo(gasto.periodo.slice(0, 7));
    setConcepto(gasto.concepto);
    setMontoMensual(String(gasto.monto_mensual));
    setCategoria(gasto.categoria);
    setMedioPago(gasto.medio_pago);
    setTratamientoFiscal(gasto.tratamiento_fiscal);
  }

  async function handleCopiarMesAnterior() {
    if (!mesAnteriorConDatos) return;
    setError(null);
    setSaving(true);
    try {
      const gastosPrevios = gastos.filter((g) => g.periodo.slice(0, 7) === mesAnteriorConDatos);
      for (const g of gastosPrevios) {
        await api.createGastoFijo({
          concepto: g.concepto,
          periodo: `${periodo}-01`,
          monto_mensual: Number(g.monto_mensual),
          categoria: g.categoria,
          medio_pago: g.medio_pago,
          tratamiento_fiscal: g.tratamiento_fiscal,
        });
      }
      cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const monto = parseFloat(montoMensual);
    if (!concepto.trim() || !categoria.trim() || !monto || monto <= 0 || !periodo) {
      setError("Completa el mes, el concepto, la categoria y un monto valido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        concepto: concepto.trim(),
        periodo: `${periodo}-01`,
        monto_mensual: monto,
        categoria: categoria.trim(),
        medio_pago: medioPago,
        tratamiento_fiscal: tratamientoFiscal,
      };
      if (editandoId) {
        await api.updateGastoFijo(editandoId, payload);
      } else {
        await api.createGastoFijo(payload);
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
    if (!confirm("¿Eliminar este gasto fijo de este mes?")) return;
    try {
      await api.deleteGastoFijo(id);
      if (editandoId === id) limpiarFormulario();
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const gastosDelPeriodo = gastos.filter((g) => fechaEnPeriodo(g.periodo, periodoFiltro));
  const totalPeriodo = gastosDelPeriodo.reduce((sum, g) => sum + Number(g.monto_mensual), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        title="Gastos fijos"
        subtitle="Cada mes registra tus gastos fijos (renta, nomina, luz, etc.). Si no cambiaron respecto al mes anterior, puedes copiarlos con un clic en vez de volver a capturarlos."
      />

      {mostrarPrecarga && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span>
            Aun no registras tus gastos fijos de <strong>{mesLegible(periodo)}</strong>.
          </span>
          <button
            type="button"
            onClick={handleCopiarMesAnterior}
            disabled={saving}
            className="rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-sm font-medium text-yellow-900 hover:bg-yellow-100 disabled:opacity-50"
          >
            Copiar los de {mesLegible(mesAnteriorConDatos!)}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center">
              Mes
              <HelpIcon texto="Este gasto se cuenta unicamente en el mes que elijas aqui; no aplica automaticamente a otros meses." />
            </span>
            <input
              type="month"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Concepto
            <input
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Renta del local"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Monto ($)
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={montoMensual}
              onChange={(e) => setMontoMensual(e.target.value)}
              placeholder="Ej. 8000"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Categoria
            <input
              list="categorias-sugeridas"
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej. Renta"
              required
            />
            <datalist id="categorias-sugeridas">
              {CATEGORIAS_SUGERIDAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center">
              Tratamiento fiscal (IVA)
              <HelpIcon texto="La mayoria de los gastos llevan IVA 16%. La nomina, por ejemplo, no es objeto de este impuesto." />
            </span>
            <select
              className="rounded-md border border-zinc-300 px-3 py-2"
              value={tratamientoFiscal}
              onChange={(e) => setTratamientoFiscal(e.target.value as TasaIva)}
            >
              {TASAS_IVA.map((t) => (
                <option key={t} value={t}>
                  {TASA_IVA_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1 text-sm sm:col-span-2">
            <legend className="mb-1">Medio de pago</legend>
            <div className="flex gap-4">
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
            {saving ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar gasto fijo"}
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
            Total ({PERIODO_LABEL[periodoFiltro].toLowerCase()}):{" "}
            <span className="font-medium text-zinc-900">{formatMoney(totalPeriodo)}</span>
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Mes</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Medio de pago</th>
              <th className="px-4 py-3 font-medium">IVA</th>
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
            {!loading && gastosDelPeriodo.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={7}>
                  No hay gastos fijos registrados en {PERIODO_LABEL[periodoFiltro].toLowerCase()}.
                </td>
              </tr>
            )}
            {[...gastosDelPeriodo]
              .sort((a, b) => (a.periodo < b.periodo ? 1 : a.periodo > b.periodo ? -1 : 0))
              .map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3">{g.periodo.slice(0, 7)}</td>
                  <td className="px-4 py-3">{g.concepto}</td>
                  <td className="px-4 py-3">{g.categoria}</td>
                  <td className="px-4 py-3">{formatMoney(Number(g.monto_mensual))}</td>
                  <td className="px-4 py-3">{MEDIO_PAGO_LABEL[g.medio_pago]}</td>
                  <td className="px-4 py-3">{TASA_IVA_LABEL[g.tratamiento_fiscal]}</td>
                  <td className="px-4 py-3 text-right">
                    <EditarButton onClick={() => handleEditar(g)} />
                    <EliminarButton onClick={() => handleDelete(g.id)} />
                  </td>
                </tr>
              ))}
          </tbody>
          {!loading && gastosDelPeriodo.length > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium">
                <td className="px-4 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-4 py-3">{formatMoney(totalPeriodo)}</td>
                <td className="px-4 py-3" colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
